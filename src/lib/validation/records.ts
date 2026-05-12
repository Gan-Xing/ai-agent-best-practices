import { Prisma } from "@prisma/client";
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

const stringArray = z
  .array(z.string().trim().min(1))
  .optional()
  .transform((value) => (value ? [...new Set(value)] : []));

export const jsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const createRecordInputSchema = z.object({
  slug: optionalTrimmedString,
  externalKey: optionalTrimmedString,
  externalId: optionalTrimmedString,
  type: optionalTrimmedString.default("NOTE"),
  categoryCode: z.string().trim().min(1),
  visibility: z.enum(["PUBLIC", "INTERNAL", "PRIVATE"]).default("INTERNAL"),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  maturity: z
    .enum(["SEED", "REVIEWED", "VALIDATED", "DEPRECATED"])
    .default("SEED"),
  freshness: z
    .enum(["UNKNOWN", "FRESH", "STALE", "NEEDS_REVIEW"])
    .default("UNKNOWN"),
  confidence: z.number().min(0).max(1).optional(),
  language: optionalTrimmedString.default("zh"),
  title: z.string().trim().min(1),
  summary: optionalTrimmedString,
  body: optionalTrimmedString,
  problem: optionalTrimmedString,
  recommendation: optionalTrimmedString,
  metadata: jsonValueSchema.optional(),
  aliases: stringArray,
  keywords: stringArray,
  tags: stringArray,
});

export const listRecordsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryCode: optionalTrimmedString,
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  type: optionalTrimmedString,
  q: optionalTrimmedString,
});
