'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/lib/auth';
import clsx from 'clsx';

const NAV_ITEMS = [
  { icon: 'analytics', label: 'Overview', href: '/dashboard' },
  { icon: 'hub', label: 'Graph', href: '/dashboard/map' },
  { icon: 'fact_check', label: 'Health', href: '/dashboard/health' },
  { icon: 'auto_fix_high', label: 'Fixes', href: '/dashboard/fixes' },
  { icon: 'menu_book', label: 'Docs', href: '/dashboard/docs' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <nav className="bg-[#09090b] font-mono text-[11px] uppercase tracking-widest fixed left-0 top-0 h-full border-r border-[#27272a] w-[64px] hover:w-[240px] transition-all duration-300 ease-in-out flex flex-col z-40 group overflow-hidden">
      {/* Logo */}
      <div className="h-16 shrink-0 flex items-center justify-center group-hover:justify-start group-hover:px-4 border-b border-[#27272a]">
        <div className="w-8 h-8 rounded-full bg-[#111114] border border-[#27272a] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">TF</span>
        </div>
        <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap hidden group-hover:block">
          <div className="text-white text-sm font-bold tracking-tight normal-case">Triefrog</div>
          <div className="text-zinc-500 text-[10px] normal-case mt-0.5">v1.0.0</div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center h-10 px-4 shrink-0 whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-zinc-900/50 text-primary border-r-2 border-primary'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#111114]',
              )}
            >
              <Icon name={item.icon} size={20} fill={isActive} className="shrink-0" />
              <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-bold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="pb-4 pt-2 border-t border-[#27272a] flex flex-col gap-1 shrink-0">
        <div className="flex items-center h-10 px-4 text-zinc-500 shrink-0 whitespace-nowrap">
          <Icon name="account_circle" size={20} className="shrink-0" />
          <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 normal-case text-xs">
            {user?.name || 'Profile'}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center h-10 px-4 text-zinc-500 hover:text-zinc-200 hover:bg-[#111114] shrink-0 whitespace-nowrap transition-colors w-full"
        >
          <Icon name="logout" size={20} className="shrink-0" />
          <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Logout
          </span>
        </button>
      </div>
    </nav>
  );
}
