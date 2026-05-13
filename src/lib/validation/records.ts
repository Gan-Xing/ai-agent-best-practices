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

const optionalDateString = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Invalid date string",
    })
    .optional(),
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

const recordTranslationInputSchema = z
  .object({
    language: z.string().trim().min(1),
    title: z.string().trim().min(1),
    summary: optionalTrimmedString,
    body: optionalTrimmedString,
    problem: optionalTrimmedString,
    recommendation: optionalTrimmedString,
    metadata: jsonValueSchema.optional(),
  })
  .strict();

const recordTranslationsSchema = z
  .array(recordTranslationInputSchema)
  .optional()
  .default([])
  .superRefine((translations, context) => {
    const seenLanguages = new Set<string>();

    for (const [index, translation] of translations.entries()) {
      if (seenLanguages.has(translation.language)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate translation language "${translation.language}"`,
          path: [index, "language"],
        });
      }

      seenLanguages.add(translation.language);
    }
  });

export const createRecordInputSchema = z.object({
  slug: optionalTrimmedString,
  externalKey: optionalTrimmedString,
  externalId: optionalTrimmedString,
  schemaVersion: z.number().int().positive().default(1),
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
  applicability: jsonValueSchema.optional(),
  compatibility: jsonValueSchema.optional(),
  tradeoffs: jsonValueSchema.optional(),
  evidence: jsonValueSchema.optional(),
  metrics: jsonValueSchema.optional(),
  curation: jsonValueSchema.optional(),
  extensions: jsonValueSchema.optional(),
  publishedAt: optionalDateString,
  lastVerifiedAt: optionalDateString,
  reviewAfter: optionalDateString,
  archivedAt: optionalDateString,
  translations: recordTranslationsSchema,
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
