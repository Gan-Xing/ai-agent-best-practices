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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8">
      <section className="relative w-full max-w-5xl">
        <div className="motion-rise mx-auto flex max-w-3xl flex-col items-center gap-8 rounded-[2rem] border border-line bg-surface px-6 py-10 text-center shadow-[var(--shadow)] backdrop-blur-xl sm:px-10 sm:py-14">
          <div className="inline-flex items-center gap-3 rounded-full border border-line bg-white/70 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.28em] text-muted">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Search-first landing page
          </div>

          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-muted">
              AI Agent Best Practices
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-[-0.05em] text-foreground sm:text-6xl">
              One search bar.
              <br />
              Everything starts there.
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-muted sm:text-lg">
              A focused homepage for searching prompts, workflows, patterns,
              and operating notes without loading the screen with anything else.
            </p>
          </div>

          <form
            action="/"
            method="GET"
            role="search"
            className="motion-rise-delayed w-full max-w-2xl"
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

          <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
            <span className="font-mono uppercase tracking-[0.24em]">
              prompt library
            </span>
            <span className="font-mono uppercase tracking-[0.24em]">
              agent playbooks
            </span>
            <span className="font-mono uppercase tracking-[0.24em]">
              workflow notes
            </span>
          </div>

          <p className="rounded-full bg-accent-soft px-4 py-2 text-sm text-muted">
            {query ? (
              <>
                Current query:
                <span className="ml-2 font-mono font-medium text-foreground">
                  {query}
                </span>
              </>
            ) : (
              "Try a natural-language query like “weekly review automation”."
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
