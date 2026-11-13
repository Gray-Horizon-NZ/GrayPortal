// A GrayScale product wears a neon "New" tag for its first 60 days in the
// catalogue (Max, 13 Nov 2026: Vigil launched with one). Read from the row's
// created_at, so the tag retires itself and nobody has to remember to take it off.
// Shown on the admin GrayScale screen, the portal's GrayScale page and the
// request widget. Style: .gh-new in src/app/globals.css.

export const NEW_PRODUCT_DAYS = 60;

export function isNewProduct(createdAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!createdAt) return false;
  const added = new Date(createdAt).getTime();
  if (Number.isNaN(added)) return false;
  const age = now.getTime() - added;
  return age >= 0 && age < NEW_PRODUCT_DAYS * 86_400_000;
}
