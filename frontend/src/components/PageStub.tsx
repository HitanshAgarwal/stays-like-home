import Link from "next/link";

/** A deliberate placeholder for pages we'll fill in later phases. */
export function PageStub({
  eyebrow,
  title,
  description,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-8 text-center shadow-[var(--shadow-card)] sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        <p className="mt-3 text-base text-ink-soft">{description}</p>
        {cta && (
          <Link
            href={cta.href}
            className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
