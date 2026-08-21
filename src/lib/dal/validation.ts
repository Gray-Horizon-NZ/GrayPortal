import "server-only";
import { z } from "zod";

// Postgres numeric columns reject anything but digits/a single decimal
// point — a user typing "1,510" (or pasting "$1,510") into a price field
// otherwise reaches the DB as a raw string and the insert/update throws a
// 500 (22P02 invalid_text_representation) instead of a validation error.
export const numericString = z
  .string()
  .transform((v) => v.replace(/[^0-9.]/g, ""))
  .refine((v) => v === "" || /^\d+(\.\d+)?$/.test(v), "Must be a number")
  .transform((v) => (v === "" ? undefined : v))
  .optional();

// Same sanitization as numericString, plus a 0-100 range check — for
// discountPercent fields, where "150" or "-10" would otherwise silently
// pass through as a numeric column value and produce a nonsense price.
export const percentString = z
  .string()
  .transform((v) => v.replace(/[^0-9.]/g, ""))
  .refine((v) => v === "" || /^\d+(\.\d+)?$/.test(v), "Must be a number")
  .refine((v) => v === "" || Number(v) <= 100, "Must be 100 or less")
  .transform((v) => (v === "" ? undefined : v))
  .optional();
