type RecordStatusValue = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
type RecordFreshnessValue = "UNKNOWN" | "FRESH" | "STALE" | "NEEDS_REVIEW";

type FreshnessInput = {
  status: RecordStatusValue | string;
  freshness: RecordFreshnessValue | string;
  reviewAfter: Date | string | null;
};

export function isReviewOverdue(
  reviewAfter: Date | string | null,
  now = new Date(),
) {
  if (!reviewAfter) {
    return false;
  }

  const parsed = reviewAfter instanceof Date ? reviewAfter : new Date(reviewAfter);

  if (Number.isNaN(parsed.valueOf())) {
    return false;
  }

  return parsed.getTime() <= now.getTime();
}

export function getEffectiveFreshness(
  input: FreshnessInput,
  now = new Date(),
) {
  if (
    input.status === "PUBLISHED" &&
    input.freshness === "FRESH" &&
    isReviewOverdue(input.reviewAfter, now)
  ) {
    return "NEEDS_REVIEW" satisfies RecordFreshnessValue;
  }

  return input.freshness;
}

export function applyEffectiveFreshness<
  T extends {
    status: string;
    freshness: string;
    reviewAfter: Date | string | null;
  },
>(record: T, now = new Date()) {
  const freshness = getEffectiveFreshness(record, now);

  if (freshness === record.freshness) {
    return record;
  }

  return {
    ...record,
    freshness,
  };
}
