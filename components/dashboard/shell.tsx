'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bookmark,
  BookOpen,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Database,
  Download,
  FileClock,
  FilePen,
  FolderOpen,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Lock,
  Menu,
  MessageCircleQuestion,
  Newspaper,
  PenSquare,
  Quote,
  Search,
  Settings,
  Settings2,
  ShieldCheck,
  Share2,
  ShieldAlert,
  Upload,
  Users,
  UserCog,
} from 'lucide-react';
import type { NavIcon, NavItem } from '@/lib/dashboard-nav';
import { DASHBOARD_NAV } from '@/lib/dashboard-nav';
import { useAuthStore } from '@/store/auth';
import { useHydrated } from '@/store/hydration';
import { useCan } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ICONS: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  users: Users,
  approvals: ClipboardCheck,
  audit: FileClock,
  accounts: Share2,
  moderation: ShieldAlert,
  settings: Settings,
  studio: PenSquare,
  upload: Upload,
  calendar: CalendarDays,
  analytics: BarChart3,
  drafts: FilePen,
  cms: BookOpen,
  search: Search,
  collections: FolderOpen,
  access: Lock,
  cite: Quote,
  api: KeyRound,
  learning: BookOpen,
  bookmarks: Bookmark,
  ask: MessageCircleQuestion,
  downloads: Download,
  health: HeartPulse,
  roles: ShieldCheck,
  activity: UserCog,
  system: Settings2,
  publishing: LineChart,
  updates: Newspaper,
  database: Database,
};

function useIsActive() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const tab = sp.get('tab');
  return (href: string) => {
    const [path, q] = href.split('?');
    const hrefTab = q ? new URLSearchParams(q).get('tab') : null;
    if (path !== pathname) return false;
    return hrefTab === tab || (!hrefTab && !tab);
  };
}

/** Nav items for the current user, filtered by the live (admin-editable) permission table. */
function useNavItems(): NavItem[] {
  const user = useAuthStore((s) => s.user);
  const { can, canFully } = useCan();
  if (!user) return [];
  return DASHBOARD_NAV[user.role].filter((it) => !it.need || (it.full ? canFully(it.need) : can(it.need)));
}

function NavList({ items, collapsed, onNavigate }: { items: NavItem[]; collapsed?: boolean; onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <ul className="space-y-0.5">
      {items.map((it) => {
        const I = ICONS[it.icon];
        const active = isActive(it.href);
        return (
          <li key={it.href}>
            <Link
              href={it.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? it.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                collapsed && 'justify-center px-2',
              )}
            >
              <I className="h-4 w-4 shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{it.label}</span>}
              {collapsed && <span className="sr-only">{it.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Mobile: a slim bar with a hamburger button that opens the same vertical menu as a drawer. */
function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();
  const user = useAuthStore((s) => s.user);
  const current = items.find((it) => isActive(it.href));
  return (
    <div className="sticky top-24 z-30 flex items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted" aria-label="Open dashboard menu">
          <Menu className="h-5 w-5" aria-hidden />
        </SheetTrigger>
        <SheetContent side="left" className="p-4">
          <SheetTitle className="pr-8">Dashboard menu</SheetTitle>
          {user && (
            <div>
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <Badge variant="secondary" className="mt-1">{ROLE_LABELS[user.role]}</Badge>
            </div>
          )}
          <nav aria-label="Dashboard">
            <NavList items={items} onNavigate={() => setOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>
      <span className="truncate text-sm font-medium">{current?.label ?? 'Dashboard'}</span>
    </div>
  );
}

/** Left vertical sidebar (collapsible) used by dashboards, Studio and Upload Centre; a hamburger drawer on mobile. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const [collapsed, setCollapsed] = useState(false);
  const items = useNavItems();
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col lg:flex-row">
      {hydrated && user && (
        <Suspense fallback={null}>
          <MobileMenu items={items} />
        </Suspense>
      )}
      <aside className={cn('sticky top-24 hidden h-[calc(100vh-6rem)] shrink-0 flex-col border-r bg-card/60 p-3 transition-[width] lg:flex', collapsed ? 'w-16' : 'w-64')}>
        <div className={cn('mb-3 flex items-center gap-2 px-1', collapsed && 'justify-center')}>
          {!collapsed && hydrated && user && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <Badge variant="secondary" className="mt-1">{ROLE_LABELS[user.role]}</Badge>
            </div>
          )}
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav aria-label="Dashboard" className="flex-1 overflow-y-auto">
          {hydrated ? (
            <Suspense fallback={null}>
              <NavList items={items} collapsed={collapsed} />
            </Suspense>
          ) : (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-8 w-full" />)}</div>
          )}
        </nav>
        {!collapsed && (
          <p className="mt-3 flex items-center gap-1.5 px-2 text-[11px] text-muted-foreground">
            <Activity className="h-3 w-3" aria-hidden /> Demo workspace · data stored in your browser
          </p>
        )}
      </aside>
      <div className="min-w-0 flex-1">
        <div className="container py-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}

/** Consistent page header inside dashboards: title + role badge + actions. */
export function DashHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="mb-6 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {user && <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>}
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
