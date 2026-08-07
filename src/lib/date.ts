/** Converts a "YYYY-MM" value from an `<input type="month">` into a full
 * "YYYY-MM-01" date string for storage — billing dates only need
 * month/year precision in the UI, but the DB column is `date`. */
export function monthInputToDate(value: string): string | undefined {
  if (!value) return undefined;
  return `${value}-01`;
}
