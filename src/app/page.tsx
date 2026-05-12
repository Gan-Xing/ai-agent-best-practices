import Link from "next/link";

import { searchRecords } from "@/lib/search";

type HomeProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const searchResult = await searchRecords(
    query ? { q: query, limit: 10 } : { limit: 6 },
  );

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 sm:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="motion-rise rounded-[2rem] border border-line bg-surface px-6 py-10 text-center shadow-[var(--shadow)] backdrop-blur-xl sm:px-10 sm:py-14">
          <div className="inline-flex items-center gap-3 rounded-full border border-line bg-white/70 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.28em] text-muted">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Server-side knowledge search
          </div>

          <div className="mx-auto mt-8 max-w-3xl space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-muted">
              AI Agent Best Practices
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-[-0.05em] text-foreground sm:text-6xl">
              Search the knowledge base.
              <br />
              Open the actual record.
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Search now runs on PostgreSQL full-text indexes with structured
              record storage behind it. Imports, records, and search all hit the
              same server-side database pipeline.
            </p>
          </div>

          <form
            action="/"
            method="GET"
            role="search"
            className="motion-rise-delayed mx-auto mt-8 w-full max-w-2xl"
          >
            <label htmlFor="site-search" className="sr-only">
              Search best practices
            </label>
            <div className="group relative flex flex-col gap-3 rounded-[1.75rem] border border-line bg-surface-strong p-3 text-left shadow-[0_16px_45px_rgba(48,36,24,0.09)] transition duration-300 focus-within:-translate-y-0.5 focus-within:border-line-strong focus-within:shadow-[0_22px_60px_rgba(48,36,24,0.15)] sm:flex-row sm:items-center">
              <div className="pointer-events-none hidden h-14 w-14 items-center justify-center rounded-[1.15rem] border border-line bg-background/70 sm:flex">
                <SearchIcon />
              </div>

              <div className="flex flex-1 items-center gap-3 rounded-[1.2rem] bg-transparent px-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-line bg-background/70 sm:hidden">
                  <SearchIcon />
                </div>
                <input
                  id="site-search"
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Search prompts, agents, workflows..."
                  className="h-14 w-full border-0 bg-transparent text-base text-foreground outline-none placeholder:text-[#948777] sm:text-lg"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-[1.2rem] bg-accent px-6 text-sm font-semibold text-white transition duration-200 hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-7 sm:text-base"
              >
                Search
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 10h12" />
                  <path d="m11 5 5 5-5 5" />
                </svg>
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
            <span className="font-mono uppercase tracking-[0.24em]">
              import pipeline
            </span>
            <span className="font-mono uppercase tracking-[0.24em]">
              postgres fts
            </span>
            <span className="font-mono uppercase tracking-[0.24em]">
              record detail pages
            </span>
          </div>

          <p className="mt-6 rounded-full bg-accent-soft px-4 py-2 text-sm text-muted">
            {query ? (
              <>
                Search returned
                <span className="mx-2 font-mono font-medium text-foreground">
                  {searchResult.total}
                </span>
                result(s) for
                <span className="ml-2 font-mono font-medium text-foreground">
                  {query}
                </span>
              </>
            ) : (
              "No query yet. Showing the latest records already imported into the database."
            )}
          </p>
        </div>

        <section className="motion-rise-delayed">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
                {query ? "Search Results" : "Latest Records"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                {query
                  ? "Results from the server-side knowledge store"
                  : "The newest records in the knowledge base"}
              </h2>
            </div>
            {searchResult.queryLogId ? (
              <span className="rounded-full border border-line bg-white/70 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                log {searchResult.queryLogId.slice(0, 8)}
              </span>
            ) : null}
          </div>

          {searchResult.items.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {searchResult.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/records/${item.slug}`}
                  className="group rounded-[1.6rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)] transition duration-200 hover:-translate-y-1 hover:border-line-strong"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted">
                    <span>{item.categoryName}</span>
                    <span>{item.type}</span>
                    <span>{item.status}</span>
                    <span>{item.matchSource}</span>
                  </div>

                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-foreground transition group-hover:text-accent">
                    {item.title}
                  </h3>

                  <p className="mt-3 line-clamp-4 text-sm leading-7 text-muted">
                    {item.summary ?? "No summary yet. Open the record to inspect the body and version history."}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted">
                    <span className="font-mono">
                      score {item.score.toFixed(3)}
                    </span>
                    <span>
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(item.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-line-strong bg-surface px-6 py-10 text-center shadow-[var(--shadow)]">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
                No Matches
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                Nothing matched that query.
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted">
                Try broader keywords, or import more records first so the search
                index has material to work with.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
