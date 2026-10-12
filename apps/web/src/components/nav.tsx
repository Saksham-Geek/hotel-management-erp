'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavIconName = 'today' | 'rooms' | 'reservations' | 'guests' | 'housekeeping';
export interface NavItem { href: string; label: string; icon: NavIconName; locked?: boolean }

export function Nav({
  items,
  collapsed = false,
  onNavigate,
}: {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      <p className={`mb-1 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white/40 ${collapsed ? 'md:sr-only' : ''}`}>
        Workspace
      </p>
      {items.map((item) => {
        const active = path === item.href || path.startsWith(item.href + '/');
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
              active
                ? 'bg-white/10 text-white shadow-[inset_2px_0_0_hsl(var(--accent))]'
                : 'text-white/65 hover:bg-white/[.07] hover:text-white'
            }`}
          >
            <NavIcon name={item.icon} active={active} />
            <span className={collapsed ? 'md:sr-only' : ''}>{item.label}</span>
            {item.locked && !collapsed && (
              <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">Plan</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function NavIcon({ name, active }: { name: NavIconName; active: boolean }) {
  const common = {
    'aria-hidden': true as const,
    className: `h-[18px] w-[18px] shrink-0 ${active ? 'text-teal-200' : 'text-white/55 group-hover:text-white/80'}`,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
  };

  switch (name) {
    case 'today':
      return <svg {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></svg>;
    case 'rooms':
      return <svg {...common}><path d="M4 19V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v11M4 13h16v6M12 10h6a2 2 0 0 1 2 2v1M2.5 19h19" /><path d="M7 9h2" /></svg>;
    case 'reservations':
      return <svg {...common}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17M8 13h3M8 16h6" /></svg>;
    case 'guests':
      return <svg {...common}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.5-3 2.3-4.5 5.5-4.5s5 1.5 5.5 4.5M16 5.2a3.2 3.2 0 0 1 0 6.1M17 14.7c2.1.5 3.2 1.9 3.5 4.3" /></svg>;
    case 'housekeeping':
      return <svg {...common}><path d="m4 20 9-9M10 4l10 10M8 6l2-2 10 10-2 2M3 21h6M14 18l3 3" /></svg>;
  }
}
