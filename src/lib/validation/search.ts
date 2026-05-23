import { z } from "zod";

const blankToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const optionalTrimmedString = z.preprocess(
  blankToUndefined,
  z.string().trim().optional(),
);

export const searchRecordsInputSchema = z.object({
  q: optionalTrimmedString,
  locale: z.enum(["zh", "en"]).default("zh"),
  categoryCode: optionalTrimmedString,
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  type: optionalTrimmedString,
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
