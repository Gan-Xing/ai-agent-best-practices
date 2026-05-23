import { z } from "zod";

import {
  createRecordInputSchema,
  jsonValueSchema,
  recordSourceInputSchema,
} from "@/lib/validation/records";

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
const requiredTrimmedString = z.string().trim().min(1);
const nonEmptyJsonObjectSchema = z
  .record(z.string(), jsonValueSchema)
  .refine((value) => Object.keys(value).length > 0, {
    message: "Object must include at least one field",
  });

export const importSourceSchema = recordSourceInputSchema;

export const importRecordInputSchema = createRecordInputSchema.safeExtend({
  sources: z.array(importSourceSchema).min(1),
});

export const importRequestSchema = z
  .object({
    sourceType: requiredTrimmedString,
    sourceLabel: requiredTrimmedString,
    metadata: nonEmptyJsonObjectSchema,
    source: importSourceSchema,
    records: z.array(importRecordInputSchema).min(1).max(100),
  })
  .strict();

export const listImportJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["QUEUED", "RUNNING", "DONE", "FAILED", "CANCELED"])
    .optional(),
  sourceType: optionalTrimmedString,
});
