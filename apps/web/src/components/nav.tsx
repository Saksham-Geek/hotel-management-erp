'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavIconName =
  | 'today'
  | 'tape-chart'
  | 'rooms'
  | 'reservations'
  | 'guests'
  | 'billing'
  | 'housekeeping'
  | 'night-audit'
  | 'compliance'
  | 'channels'
  | 'plans'
  | 'admin'
  | 'marketing'
  | 'staff'
  | 'guide'
  | 'income'
  | 'food'
  | 'keycard'
  | 'settings';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  group?: string;
  locked?: boolean;
}

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

  // Group items by their defined group name
  const groups: { name: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const groupName = item.group ?? 'Workspace';
    let g = groups.find((x) => x.name === groupName);
    if (!g) {
      g = { name: groupName, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.name} className="flex flex-col gap-1">
          <div className={`px-3.5 pt-2 pb-1 ${collapsed ? 'md:sr-only' : ''}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {group.name}
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex min-h-[42px] items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[13.5px] transition-all duration-150 ${
                    active
                      ? 'bg-white/[0.12] text-white font-bold shadow-xs'
                      : 'text-slate-300 font-medium hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-white shadow-xs"
                    />
                  )}
                  <NavIcon name={item.icon} active={active} />
                  <span className={`truncate leading-snug ${collapsed ? 'md:sr-only' : ''}`}>
                    {item.label}
                  </span>
                  {item.locked && !collapsed && (
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 border border-white/20">
                      Tier
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavIcon({ name, active }: { name: NavIconName; active: boolean }) {
  const common = {
    'aria-hidden': true as const,
    className: `h-5 w-5 shrink-0 transition-colors duration-150 ${
      active
        ? 'text-white'
        : 'text-slate-400 group-hover:text-slate-200'
    }`,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
  };

  switch (name) {
    case 'today':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'tape-chart':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 4v16M13 10v10M18 10v10" />
        </svg>
      );
    case 'rooms':
      return (
        <svg {...common}>
          <path d="M4 19V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v11M4 13h16v6M12 10h6a2 2 0 0 1 2 2v1M2.5 19h19" />
          <path d="M7 9h2" />
        </svg>
      );
    case 'reservations':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17M8 13h3M8 16h6" />
        </svg>
      );
    case 'guests':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19c.5-3 2.3-4.5 5.5-4.5s5 1.5 5.5 4.5M16 5.2a3.2 3.2 0 0 1 0 6.1M17 14.7c2.1.5 3.2 1.9 3.5 4.3" />
        </svg>
      );
    case 'billing':
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <path d="M7 15h2M12 15h5" />
        </svg>
      );
    case 'housekeeping':
      return (
        <svg {...common}>
          <path d="m4 20 9-9M10 4l10 10M8 6l2-2 10 10-2 2M3 21h6M14 18l3 3" />
        </svg>
      );
    case 'night-audit':
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case 'compliance':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'channels':
      return (
        <svg {...common}>
          <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M4 20h.01" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'plans':
      return (
        <svg {...common}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case 'admin':
      return (
        <svg {...common}>
          <path d="M3 21h18M5 21V7l8-4v18M13 7l6 3v11M9 9v1M9 13v1M9 17v1M17 13v1M17 17v1" />
        </svg>
      );
    case 'marketing':
      return (
        <svg {...common}>
          <path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" />
          <path d="M12 5l7-3v14l-7-3" />
        </svg>
      );
    case 'staff':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'guide':
      return (
        <svg {...common}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case 'income':
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-5 5" />
          <path d="M19 14V9h-5" />
        </svg>
      );
    case 'food':
      return (
        <svg {...common}>
          <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
        </svg>
      );
    case 'keycard':
      return (
        <svg {...common}>
          <circle cx="7.5" cy="15.5" r="4.5" />
          <path d="m10.5 12.5 8-8M15 8l3 3M17 6l2 2" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}
