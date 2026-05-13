import Link from "next/link";
import { notFound } from "next/navigation";

import { AppError } from "@/lib/errors";
import { getRecordBySlug } from "@/lib/records";

type RecordPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function Section({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-[1.5rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]">
      <h2 className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
        {title}
      </h2>
      <div className="mt-3 text-sm leading-7 text-foreground sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

async function getRecordOrNotFound(slug: string) {
  try {
    return await getRecordBySlug(slug);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function RecordPage({ params }: RecordPageProps) {
  const { slug } = await params;
  const record = await getRecordOrNotFound(slug);
  const latestVersion = record.versions[0] ?? null;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={record.title ? `/?q=${encodeURIComponent(record.title)}` : "/"}
            className="inline-flex items-center rounded-full border border-line bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-muted transition hover:border-line-strong hover:text-foreground"
          >
            Back To Search
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted">
            <span>{record.category.name}</span>
            <span>{record.status}</span>
            <span>{record.maturity}</span>
          </div>
        </div>

        <header className="rounded-[2rem] border border-line bg-surface px-6 py-8 shadow-[var(--shadow)]">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
            {record.slug}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            {record.title}
          </h1>
          {record.summary ? (
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
              {record.summary}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {record.tags.map((item) => (
              <span
                key={item.tagId}
                className="rounded-full border border-line bg-background/80 px-3 py-1 text-sm text-muted"
              >
                {item.tag.name}
              </span>
            ))}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <div className="space-y-6">
            {record.body ? (
              <Section title="Body">
                <p className="whitespace-pre-wrap">{record.body}</p>
              </Section>
            ) : null}

            {record.problem ? (
              <Section title="Problem">
                <p className="whitespace-pre-wrap">{record.problem}</p>
              </Section>
            ) : null}

            {record.recommendation ? (
              <Section title="Recommendation">
                <p className="whitespace-pre-wrap">{record.recommendation}</p>
              </Section>
            ) : null}

            <Section title="Versions">
              <div className="space-y-3">
                {record.versions.map((version) => (
                  <div
                    key={version.id}
                    className="rounded-[1.2rem] border border-line bg-background/70 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                        v{version.versionNo} · {version.changeType}
                      </span>
                      <span className="text-xs text-muted">
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(version.createdAt)}
                      </span>
                    </div>
                    {version.note ? (
                      <p className="mt-2 text-sm text-foreground">
                        {version.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <aside className="space-y-6">
            <Section title="Record Meta">
              <dl className="space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Category</dt>
                  <dd>{record.category.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Type</dt>
                  <dd>{record.type}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Language</dt>
                  <dd>{record.language}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Confidence</dt>
                  <dd>{record.confidence ?? "n/a"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Updated</dt>
                  <dd>
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(record.updatedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Search Index</dt>
                  <dd>{record.searchIndexes.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Chunks</dt>
                  <dd>{record.chunks.length}</dd>
                </div>
              </dl>
            </Section>

            {record.aliases.length ? (
              <Section title="Aliases">
                <div className="flex flex-wrap gap-2">
                  {record.aliases.map((alias) => (
                    <span
                      key={alias.id}
                      className="rounded-full border border-line bg-background/80 px-3 py-1 text-sm text-muted"
                    >
                      {alias.alias}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}

            {record.keywords.length ? (
              <Section title="Keywords">
                <div className="flex flex-wrap gap-2">
                  {record.keywords.map((keyword) => (
                    <span
                      key={keyword.id}
                      className="rounded-full border border-line bg-background/80 px-3 py-1 text-sm text-muted"
                    >
                      {keyword.keyword}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}

            {latestVersion?.snapshot ? (
              <Section title="Latest Snapshot">
                <pre className="overflow-x-auto rounded-[1rem] bg-[#f5efe4] p-4 text-xs leading-6 text-foreground">
                  {JSON.stringify(latestVersion.snapshot, null, 2)}
                </pre>
              </Section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
