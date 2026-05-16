import { z } from "zod";

export const GITHUB_REPO_CARD_SCHEMA_VERSION = 1;
export const GITHUB_REPO_CARD_KIND = "github-repo-card";

const blankToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const requiredTrimmedString = z.string().trim().min(1);
const optionalTrimmedString = z.preprocess(
  blankToUndefined,
  z.string().trim().optional(),
);
const optionalUrlString = z.preprocess(
  blankToUndefined,
  z.string().trim().url().optional(),
);
const requiredDateString = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date string",
  });
const requiredCategoryCodeString = z.string().trim().regex(/^\d{2}$/, {
  message: "Use a two-digit category code, for example: 09",
});
const requiredSlugString = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Use lowercase kebab-case",
  });
const githubOwnerString = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,38}$/, {
  message: "Use a lowercase GitHub owner, for example: langchain-ai",
});
const githubRepoString = z.string().trim().regex(/^[a-z0-9][a-z0-9._-]*$/, {
  message: "Use a lowercase GitHub repo name, for example: langgraph",
});
const githubCardKeyString = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{0,38}__[a-z0-9][a-z0-9._-]*$/, {
    message: "Use {owner}__{repo} in lowercase",
  });
const stringArrayItem = z.string().trim().min(1);
const uniqueNonEmptyStringArray = z
  .array(stringArrayItem)
  .min(1)
  .transform((items) => [...new Set(items)]);

const githubRepoIdentitySchema = z
  .object({
    host: z.literal("github"),
    owner: githubOwnerString,
    name: githubRepoString,
    fullName: requiredTrimmedString,
    url: z.string().trim().url(),
  })
  .strict()
  .superRefine((repo, context) => {
    const expectedFullName = `${repo.owner}/${repo.name}`;
    const expectedUrl = `https://github.com/${repo.owner}/${repo.name}`;

    if (repo.fullName !== expectedFullName) {
      context.addIssue({
        code: "custom",
        message: `fullName must be "${expectedFullName}"`,
        path: ["fullName"],
      });
    }

    if (repo.url !== expectedUrl) {
      context.addIssue({
        code: "custom",
        message: `url must be "${expectedUrl}"`,
        path: ["url"],
      });
    }
  });

const githubClassificationSchema = z
  .object({
    categoryCode: requiredCategoryCodeString,
    secondaryCategoryCodes: z
      .array(requiredCategoryCodeString)
      .transform((items) => [...new Set(items)])
      .optional(),
    recordType: requiredTrimmedString,
    tags: uniqueNonEmptyStringArray,
    keywords: uniqueNonEmptyStringArray,
  })
  .strict();

const githubReviewSchema = z
  .object({
    addedAt: requiredDateString,
    lastReviewedAt: requiredDateString,
    reviewAfter: requiredDateString,
  })
  .strict()
  .superRefine((review, context) => {
    const addedAt = Date.parse(review.addedAt);
    const lastReviewedAt = Date.parse(review.lastReviewedAt);
    const reviewAfter = Date.parse(review.reviewAfter);

    if (lastReviewedAt < addedAt) {
      context.addIssue({
        code: "custom",
        message: "lastReviewedAt must be on or after addedAt",
        path: ["lastReviewedAt"],
      });
    }

    if (reviewAfter < lastReviewedAt) {
      context.addIssue({
        code: "custom",
        message: "reviewAfter must be on or after lastReviewedAt",
        path: ["reviewAfter"],
      });
    }
  });

const githubLinksSchema = z
  .object({
    docs: optionalUrlString,
    demo: optionalUrlString,
    examples: optionalUrlString,
  })
  .strict()
  .optional();

const githubConnectionsSchema = z
  .object({
    relatedRecordSlugs: z
      .array(requiredSlugString)
      .transform((items) => [...new Set(items)])
      .optional(),
    note: optionalTrimmedString,
  })
  .strict()
  .optional();

export const githubRepoCardSchema = z
  .object({
    schemaVersion: z.literal(GITHUB_REPO_CARD_SCHEMA_VERSION),
    kind: z.literal(GITHUB_REPO_CARD_KIND),
    cardKey: githubCardKeyString,
    repo: githubRepoIdentitySchema,
    classification: githubClassificationSchema,
    summary: requiredTrimmedString,
    whyItMatters: requiredTrimmedString,
    notes: optionalTrimmedString,
    status: z.enum(["inbox", "watching", "curated", "archived"]),
    review: githubReviewSchema,
    links: githubLinksSchema,
    connections: githubConnectionsSchema,
  })
  .strict()
  .superRefine((card, context) => {
    const expectedCardKey = `${card.repo.owner}__${card.repo.name}`;
    const secondaryCategoryCodes = card.classification.secondaryCategoryCodes ?? [];

    if (card.cardKey !== expectedCardKey) {
      context.addIssue({
        code: "custom",
        message: `cardKey must be "${expectedCardKey}"`,
        path: ["cardKey"],
      });
    }

    if (secondaryCategoryCodes.includes(card.classification.categoryCode)) {
      context.addIssue({
        code: "custom",
        message: "secondaryCategoryCodes must not repeat the primary categoryCode",
        path: ["classification", "secondaryCategoryCodes"],
      });
    }
  });

export type GithubRepoCard = z.infer<typeof githubRepoCardSchema>;
