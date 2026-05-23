export default function Loading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.08),transparent_28%),linear-gradient(180deg,#f8fafb_0%,#f2f5f8_100%)] text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="h-8 w-40 rounded-full bg-white/70" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="h-4 w-40 rounded-full bg-white/70" />
            <div className="mt-4 h-24 max-w-4xl rounded-[2rem] bg-white/80" />
            <div className="mt-5 h-5 max-w-2xl rounded-full bg-white/70" />
            <div className="mt-3 h-5 max-w-xl rounded-full bg-white/70" />
          </div>
          <div className="rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]">
            <div className="h-4 w-28 rounded-full bg-white/70" />
            <div className="mt-4 h-5 w-full rounded-full bg-white/70" />
            <div className="mt-3 h-5 w-11/12 rounded-full bg-white/70" />
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[1.4rem] border border-line bg-surface px-4 py-4 shadow-[var(--shadow)]"
            >
              <div className="h-3 w-20 rounded-full bg-white/70" />
              <div className="mt-4 h-7 w-16 rounded-full bg-white/80" />
              <div className="mt-2 h-4 w-28 rounded-full bg-white/70" />
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]">
          <div className="h-5 w-36 rounded-full bg-white/70" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index}>
                <div className="h-3 w-16 rounded-full bg-white/70" />
                <div className="mt-2 h-11 rounded-xl bg-white/80" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)]"
            >
              <div className="flex gap-2">
                <div className="h-7 w-24 rounded-full bg-white/80" />
                <div className="h-7 w-20 rounded-full bg-white/70" />
              </div>
              <div className="mt-5 h-4 w-20 rounded-full bg-white/70" />
              <div className="mt-3 h-8 w-40 rounded-full bg-white/80" />
              <div className="mt-5 h-4 w-full rounded-full bg-white/70" />
              <div className="mt-3 h-4 w-11/12 rounded-full bg-white/70" />
              <div className="mt-6 h-11 w-32 rounded-full bg-white/80" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
