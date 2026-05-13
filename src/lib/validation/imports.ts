import { z } from "zod";

import {
  createRecordInputSchema,
  jsonValueSchema,
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

export const importSourceSchema = z.object({
  sourceKey: optionalTrimmedString,
  sourceType: optionalTrimmedString,
  uri: optionalTrimmedString,
  title: optionalTrimmedString,
  author: optionalTrimmedString,
  publisher: optionalTrimmedString,
  publishedAt: optionalDateString,
  accessedAt: optionalDateString,
  checksum: optionalTrimmedString,
  rawPayload: jsonValueSchema.optional(),
  metadata: jsonValueSchema.optional(),
  role: optionalTrimmedString.default("REFERENCE"),
  quote: optionalTrimmedString,
  note: optionalTrimmedString,
});

export const importRecordInputSchema = createRecordInputSchema.extend({
  source: importSourceSchema.optional(),
  sources: z.array(importSourceSchema).optional().default([]),
});

export const importRequestSchema = z.object({
  sourceType: z.string().trim().min(1),
  sourceLabel: optionalTrimmedString,
  metadata: jsonValueSchema.optional(),
  source: importSourceSchema.optional(),
  records: z.array(importRecordInputSchema).min(1).max(100),
});

export const listImportJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["QUEUED", "RUNNING", "DONE", "FAILED", "CANCELED"])
    .optional(),
  sourceType: optionalTrimmedString,
});
