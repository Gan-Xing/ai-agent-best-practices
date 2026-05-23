import { Link } from "@/i18n/navigation";

export const GITHUB_STATUS_VALUES = ["inbox", "watching", "curated", "archived"] as const;

export const GITHUB_SORT_VALUES = ["review", "upstream", "stars", "name"] as const;

export function Badge({
  children,
  tone = "default",
}: Readonly<{
  children: React.ReactNode;
  tone?: "default" | "teal" | "blue" | "amber" | "slate";
}>) {
  const tones = {
    default: "border-line bg-background/80 text-muted",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    blue: "border-sky-200 bg-sky-50 text-sky-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.02em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
}>) {
  return (
    <div className="rounded-[1.4rem] border border-line bg-surface px-4 py-4 shadow-[var(--shadow)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}

export function Section({
  title,
  eyebrow,
  children,
  className,
}: Readonly<{
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={`rounded-[2rem] border border-line bg-surface px-5 py-5 shadow-[var(--shadow)] sm:px-6 sm:py-6 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-1">
        {eyebrow ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className="mt-4 text-sm leading-7 text-foreground">{children}</div>
    </section>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
}: Readonly<{
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}>) {
  return (
    <label htmlFor={htmlFor} className="block space-y-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function FieldInput({
  id,
  name,
  defaultValue,
  placeholder,
}: Readonly<{
  id: string;
  name: string;
  defaultValue: string;
  placeholder: string;
}>) {
  return (
    <input
      id={id}
      name={name}
      type="search"
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-line bg-surface-strong px-3 text-sm text-foreground outline-none transition focus:border-line-strong focus:ring-2 focus:ring-accent-soft"
    />
  );
}

export function FieldSelect({
  id,
  name,
  defaultValue,
  children,
}: Readonly<{
  id: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}>) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="h-11 w-full rounded-xl border border-line bg-surface-strong px-3 text-sm text-foreground outline-none transition focus:border-line-strong focus:ring-2 focus:ring-accent-soft"
    >
      {children}
    </select>
  );
}

export function LinkButton({
  href,
  children,
  tone = "primary",
}: Readonly<{
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "secondary";
}>) {
  const classes =
    tone === "primary"
      ? "bg-accent text-white hover:bg-accent-strong"
      : "border border-line bg-white text-foreground hover:border-line-strong hover:bg-background";
  const className = `inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${classes}`;
  const isExternal = /^https?:\/\//.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function statusTone(status: string) {
  switch (status) {
    case "watching":
      return "teal";
    case "curated":
      return "blue";
    case "archived":
      return "slate";
    default:
      return "amber";
  }
}

export function statusLabel(status: string, labels?: Record<string, string>) {
  return labels?.[status] ?? status;
}

export function formatDate(value: string | null | undefined, locale = "zh-CN") {
  if (!value) return "—";
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) return value;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(parsed);
}
