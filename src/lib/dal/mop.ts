import "server-only";
import { ZipArchive } from "archiver";
import { randomBytes, createCipheriv } from "node:crypto";
import { mopArchives } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { withCaller } from "./auth";
import { assertRole } from "./session";
import { assertVaultVerified } from "./vaultAuth";
import { auditReveal } from "./mutate";
import { listCredentials, revealCredential, createCredential, rotateCredentialSecret } from "./credentials";
import { adminBucket } from "@/lib/firebase/admin";

const MOP_PASSWORD_LABEL = "Mobile Operations Package";

function zipBuffer(entries: { name: string; content: string }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    for (const entry of entries) archive.append(entry.content, { name: entry.name });
    archive.finalize();
  });
}

// password is 32 random bytes, base64-encoded — used directly as AES-256
// key material (not a KDF over human-chosen text), so this is a
// straightforward symmetric-encrypt-a-blob operation, not password hashing.
function encryptZip(buffer: Buffer, password: string): Buffer {
  const key = Buffer.from(password, "base64").subarray(0, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]); // [12B iv][16B tag][ciphertext]
}

/**
 * Static-file, manually-regenerated model per the brief (§14) — not
 * live/on-demand generation. Admin-only, requires the same fresh vault
 * MFA as a credential reveal (this bundles decrypted secrets, so it's at
 * least as sensitive as one). Every generation hard-deletes the previous
 * archive (row + Storage object) rather than soft-deleting it, and the
 * decryption password is stored/rotated as a Phase 6 vault credential —
 * never shown once and discarded.
 */
export async function generateMop() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await assertVaultVerified(caller);

    const allCreds = await listCredentials();
    const decrypted = [];
    for (const c of allCreds) {
      if (c.label === MOP_PASSWORD_LABEL && c.clientId === null) continue; // don't bundle the MOP's own password inside itself
      const { secret } = await revealCredential(c.id);
      decrypted.push({ label: c.label, username: c.username, url: c.url, clientId: c.clientId, secret });
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      credentials: decrypted,
      toolStack: {
        mcpEndpoint: "/api/mcp",
        note: "Connect an MCP client using a token minted from Settings > MCP access on the running GrayPortal instance.",
      },
    };

    const zip = await zipBuffer([{ name: "mop-manifest.json", content: JSON.stringify(manifest, null, 2) }]);
    const password = randomBytes(32).toString("base64");
    const encrypted = encryptZip(zip, password);

    const storagePath = `mop/mop-${Date.now()}.enc`;
    await adminBucket().file(storagePath).save(encrypted, { contentType: "application/octet-stream", resumable: false });

    const [previous] = await tx.select().from(mopArchives).orderBy(desc(mopArchives.generatedAt)).limit(1);
    if (previous) {
      await adminBucket().file(previous.storagePath).delete({ ignoreNotFound: true });
      await tx.delete(mopArchives).where(eq(mopArchives.id, previous.id));
    }

    const [archive] = await tx.insert(mopArchives).values({ storagePath, generatedBy: caller.userId }).returning();

    const existingCred = allCreds.find((c) => c.label === MOP_PASSWORD_LABEL && c.clientId === null);
    if (existingCred) {
      await rotateCredentialSecret(existingCred.id, password);
    } else {
      await createCredential({
        clientId: null,
        label: MOP_PASSWORD_LABEL,
        secret: password,
        notes: "Decrypts the current Mobile Operations Package archive.",
      });
    }

    // No literal severity column exists on audit_log yet (see Phase 6's
    // notes) — this uses the same "reveal" action as a credential view,
    // the closest equivalent to "high-severity" the schema currently has.
    await auditReveal(tx, archive.id, { caller, entityType: "mop" });
    return { storagePath, generatedAt: archive.generatedAt };
  });
}

const MAX_MOP_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB — a hand-prepared ops-package zip, not a small doc upload

/**
 * Simpler alternative to generateMop() for when Max just wants to store
 * and later re-download his own already-prepared ZIP (e.g. a portable
 * install of his local agents) rather than have the app assemble one from
 * vault credentials. Shares the same single-latest-archive slot — whichever
 * of generate/upload ran most recently is what's downloadable — same
 * admin-only + fresh-MFA gate as the rest of this file, since it's stored
 * in the same private bucket location. Not re-encrypted server-side (per
 * Max: "just a zip file upload and download option... personally secured
 * download file essentially") — private Storage object + signed URL +
 * vault MFA gate is the protection, same trust model as dal/documents.ts.
 */
export async function uploadMop(file: File): Promise<void> {
  if (file.size > MAX_MOP_UPLOAD_BYTES) {
    throw new Error(`File too large — max ${MAX_MOP_UPLOAD_BYTES / (1024 * 1024)}MB`);
  }
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await assertVaultVerified(caller);

    const bytes = Buffer.from(await file.arrayBuffer());
    const storagePath = `mop/mop-${Date.now()}-${file.name}`;
    await adminBucket().file(storagePath).save(bytes, { contentType: "application/zip", resumable: false });

    const [previous] = await tx.select().from(mopArchives).orderBy(desc(mopArchives.generatedAt)).limit(1);
    if (previous) {
      await adminBucket().file(previous.storagePath).delete({ ignoreNotFound: true });
      await tx.delete(mopArchives).where(eq(mopArchives.id, previous.id));
    }

    const [archive] = await tx.insert(mopArchives).values({ storagePath, generatedBy: caller.userId }).returning();
    await auditReveal(tx, archive.id, { caller, entityType: "mop" });
  });
}

export async function downloadMop(): Promise<{ url: string } | null> {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    await assertVaultVerified(caller);
    const [archive] = await tx.select().from(mopArchives).orderBy(desc(mopArchives.generatedAt)).limit(1);
    if (!archive) return null;
    const [url] = await adminBucket()
      .file(archive.storagePath)
      .getSignedUrl({ action: "read", expires: Date.now() + 5 * 60 * 1000 });
    await auditReveal(tx, archive.id, { caller, entityType: "mop" });
    return { url };
  });
}

export async function getMopStatus() {
  return withCaller(async (caller, tx) => {
    assertRole(caller, "admin");
    const [archive] = await tx.select().from(mopArchives).orderBy(desc(mopArchives.generatedAt)).limit(1);
    return archive ?? null;
  });
}
