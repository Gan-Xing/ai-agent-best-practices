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

const requiredTrimmedString = z.string().trim().min(1);
const requiredDateString = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date string",
  });
const requiredSlugString = requiredTrimmedString.regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  {
    message: "Use lowercase kebab-case, for example: hybrid-search-basics",
  },
);
const requiredCategoryCodeString = z.string().trim().regex(/^\d{2}$/, {
  message: "Use a two-digit category code, for example: 01",
});

const stringArrayItem = z.string().trim().min(1);
const requiredStringArray = z
  .array(stringArrayItem)
  .transform((value) => [...new Set(value)]);
const requiredNonEmptyStringArray = z
  .array(stringArrayItem)
  .min(1)
  .transform((value) => [...new Set(value)]);

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

const jsonObjectSchema = z.record(z.string(), jsonValueSchema);
const nonEmptyJsonObjectSchema = jsonObjectSchema.refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "Object must include at least one field",
  },
);

const recordTranslationInputSchema = z
  .object({
    language: z.string().trim().min(1),
    title: z.string().trim().min(1),
    summary: requiredTrimmedString,
    body: requiredTrimmedString,
    problem: requiredTrimmedString,
    recommendation: requiredTrimmedString,
    metadata: nonEmptyJsonObjectSchema,
  })
  .strict();

const recordTranslationsSchema = z
  .array(recordTranslationInputSchema)
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

export const recordSourceInputSchema = z
  .object({
    sourceKey: requiredTrimmedString,
    sourceType: requiredTrimmedString,
    uri: optionalTrimmedString,
    title: requiredTrimmedString,
    author: optionalTrimmedString,
    publisher: optionalTrimmedString,
    publishedAt: optionalDateString,
    accessedAt: optionalDateString,
    checksum: optionalTrimmedString,
    rawPayload: jsonValueSchema.optional(),
    metadata: jsonValueSchema.optional(),
    role: requiredTrimmedString,
    quote: optionalTrimmedString,
    note: requiredTrimmedString,
  })
  .strict();

const recordRelationInputSchema = z
  .object({
    toExternalKey: optionalTrimmedString,
    toSlug: optionalTrimmedString,
    relationType: requiredTrimmedString,
    strength: z.number().min(0).max(1),
    description: requiredTrimmedString,
    metadata: jsonObjectSchema,
  })
  .strict()
  .superRefine((relation, context) => {
    if (!relation.toExternalKey && !relation.toSlug) {
      context.addIssue({
        code: "custom",
        message: "Relation must include toExternalKey or toSlug",
        path: ["toExternalKey"],
      });
    }
  });

const recordRelationsSchema = z
  .array(recordRelationInputSchema)
  .superRefine((relations, context) => {
    const seenRelations = new Set<string>();

    for (const [index, relation] of relations.entries()) {
      const target = relation.toExternalKey
        ? `externalKey:${relation.toExternalKey}`
        : `slug:${relation.toSlug}`;
      const key = `${target}:${relation.relationType}`;

      if (seenRelations.has(key)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate relation "${key}"`,
          path: [index, "relationType"],
        });
      }

      seenRelations.add(key);
    }
  });

export const createRecordInputSchema = z
  .object({
    slug: requiredSlugString,
    externalKey: requiredTrimmedString,
    externalId: optionalTrimmedString,
    schemaVersion: z.literal(1),
    type: requiredTrimmedString,
    categoryCode: requiredCategoryCodeString,
    visibility: z.enum(["PUBLIC", "INTERNAL", "PRIVATE"]),
    status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
    maturity: z.enum(["SEED", "REVIEWED", "VALIDATED", "DEPRECATED"]),
    freshness: z.enum(["UNKNOWN", "FRESH", "STALE", "NEEDS_REVIEW"]),
    confidence: z.number().min(0).max(1),
    language: requiredTrimmedString,
    title: z.string().trim().min(1),
    summary: requiredTrimmedString,
    body: requiredTrimmedString,
    problem: requiredTrimmedString,
    recommendation: requiredTrimmedString,
    metadata: nonEmptyJsonObjectSchema,
    applicability: nonEmptyJsonObjectSchema,
    compatibility: nonEmptyJsonObjectSchema,
    tradeoffs: nonEmptyJsonObjectSchema,
    evidence: nonEmptyJsonObjectSchema,
    metrics: nonEmptyJsonObjectSchema,
    curation: nonEmptyJsonObjectSchema,
    extensions: nonEmptyJsonObjectSchema,
    publishedAt: requiredDateString,
    lastVerifiedAt: requiredDateString,
    reviewAfter: requiredDateString,
    archivedAt: optionalDateString,
    translations: recordTranslationsSchema,
    aliases: requiredStringArray,
    keywords: requiredNonEmptyStringArray,
    tags: requiredNonEmptyStringArray,
    relations: recordRelationsSchema,
  })
  .strict()
  .superRefine((record, context) => {
    for (const [index, translation] of record.translations.entries()) {
      if (translation.language === record.language) {
        context.addIssue({
          code: "custom",
          message: "Translation language must differ from the primary record language",
          path: ["translations", index, "language"],
        });
      }
    }
  });

export const listRecordsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryCode: optionalTrimmedString,
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  type: optionalTrimmedString,
  q: optionalTrimmedString,
});
