'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem { href: string; label: string; locked?: boolean }

export function Nav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-row flex-wrap gap-1 md:flex-col">
      {items.map((it) => {
        const active = path === it.href || path.startsWith(it.href + '/');
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${active ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white'}`}
          >
            <span>{it.label}</span>
            {it.locked && <span className="rounded bg-brass/90 px-1.5 py-0.5 text-[11px] font-medium text-white">Upgrade</span>}
          </Link>
        );
      })}
    </nav>
  );
}
