import Link from "next/link";

export type Crumb = { name: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Brotkrumen" className="text-[13px] text-cream/50">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((c, i) => (
          <li key={c.name} className="flex items-center gap-2">
            {c.href && i < items.length - 1 ? <Link href={c.href} className="transition-colors hover:text-cream">{c.name}</Link> : <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-cream/80">{c.name}</span>}
            {i < items.length - 1 && <span aria-hidden className="text-cream/25">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
