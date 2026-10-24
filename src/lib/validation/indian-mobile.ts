import { z } from "zod";

export const indianMobileSchema = z.string().trim().refine(
  (value) => value === "" || /^[6-9]\d{9}$/.test(value),
  "Enter a valid 10-digit Indian mobile number starting with 6-9",
).optional();
