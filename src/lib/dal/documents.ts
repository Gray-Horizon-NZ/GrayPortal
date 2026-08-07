import "server-only";
import { documents } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withCaller } from "./auth";
import { auditedInsert } from "./mutate";
import { adminBucket } from "@/lib/firebase/admin";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const DocType = z.enum(["proposal", "contract", "deck", "other"]);

export const DocumentInput = z.object({
  clientId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  docType: DocType,
});
export type DocumentInputT = z.infer<typeof DocumentInput>;

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Admin-side upload: writes bytes to Storage first, then records the row —
 * if the DB insert fails the object is orphaned (acceptable; an orphaned
 * blob is not a data leak) but a row is never created pointing at bytes
 * that don't exist. `fileRef` is the Storage object path, never a public
 * URL — nothing downstream can read it without going through
 * getDocumentDownloadUrl below, which re-checks access on every call.
 */
export async function uploadDocument(input: DocumentInputT, file: File) {
  const data = DocumentInput.parse(input);
  const parents = [data.companyId, data.contactId, data.dealId].filter(Boolean);
  if (parents.length !== 1) {
    throw new Error("Document must link to exactly one of company, contact, or deal");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit`);
  }

  return withCaller(async (caller, tx) => {
    const objectPath = `documents/${data.clientId ?? "internal"}/${randomUUID()}-${file.name}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await adminBucket().file(objectPath).save(bytes, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
    });

    return auditedInsert(
      tx,
      documents,
      { ...data, fileRef: objectPath, uploadedBy: caller.userId },
      { caller, entityType: "document" }
    );
  });
}

/**
 * Alternative to uploadDocument() for a document GrayPortal never stores a
 * copy of — a Drive link or an already-hosted PDF. Same "exactly one
 * parent" validation as the upload path; the DB's documents_exactly_one_source
 * check is the actual enforcement of fileRef xor externalUrl, this just
 * fails with a readable message before hitting that constraint.
 */
export async function linkDocument(input: DocumentInputT, externalUrl: string) {
  const data = DocumentInput.parse(input);
  const parents = [data.companyId, data.contactId, data.dealId].filter(Boolean);
  if (parents.length !== 1) {
    throw new Error("Document must link to exactly one of company, contact, or deal");
  }
  if (!externalUrl.trim()) {
    throw new Error("A URL is required");
  }

  return withCaller(async (caller, tx) => {
    return auditedInsert(
      tx,
      documents,
      { ...data, externalUrl, uploadedBy: caller.userId },
      { caller, entityType: "document" }
    );
  });
}

export async function listDocumentsForClient(clientId: string) {
  return withCaller(async (_caller, tx) => {
    return tx
      .select()
      .from(documents)
      .where(and(eq(documents.clientId, clientId), isNull(documents.deletedAt)));
  });
}

/**
 * Mints a short-lived signed URL for a single document, after re-verifying
 * (via RLS on this SELECT — client sessions are scoped to their own
 * client_id, see db/sql/001_roles_and_rls.sql) that the caller is allowed
 * to see this row at all. A caller who isn't authorized gets a 404-shaped
 * "not found" (no row), not a 403 — RLS makes the two indistinguishable at
 * the query level, which is the point: no oracle for probing other
 * clients' document IDs.
 */
export async function getDocumentDownloadUrl(documentId: string): Promise<string | null> {
  return withCaller(async (_caller, tx) => {
    const [doc] = await tx
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);
    if (!doc) return null;
    if (doc.externalUrl) return doc.externalUrl;

    const [url] = await adminBucket()
      .file(doc.fileRef!)
      .getSignedUrl({ action: "read", expires: Date.now() + 5 * 60 * 1000 });
    return url;
  });
}
