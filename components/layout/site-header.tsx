'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import {
  ChevronDown,
  Contrast,
  Database,
  FlaskConical,
  Globe2,
  Home,
  Images,
  Map as MapIcon,
  Newspaper,
  Ship,
  type LucideIcon,
  Languages,
  LayoutDashboard,
  Laptop,
  LogOut,
  Menu,
  Moon,
  PenSquare,
  Repeat,
  Search,
  Settings,
  Sun,
  Upload,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Wordmark } from './wordmark';
import { ToolIcon } from './tool-icon';
import { MAIN_NAV, MAP_VIEWS, TOOLS } from '@/lib/nav';
import type { DictKey } from '@/lib/i18n/dictionary';
import { useT } from '@/lib/i18n';
import { useUiStore, type TextSize } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { useHydrated } from '@/store/hydration';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, Switch } from '@/components/ui/misc';
import { Label } from '@/components/ui/label';
import { ROLE_LABELS } from '@/lib/constants';
import { useCan, dashboardPathFor } from '@/lib/permissions';
import { cn, initials } from '@/lib/utils';
import type { Role, UiLang } from '@/types';
import { NotificationBell } from './notification-bell';

const UI_LANGS: { code: UiLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

function GovStrip() {
  const t = useT();
  const { textSize, setTextSize, highContrast, toggleHighContrast } = useUiStore();
  const sizes: { v: TextSize; l: string; aria: string }[] = [
    { v: 'sm', l: 'A-', aria: 'Decrease text size' },
    { v: 'md', l: 'A', aria: 'Default text size' },
    { v: 'lg', l: 'A+', aria: 'Increase text size' },
  ];
  return (
    <div className="bg-polar-navy text-[12px] text-white/85">
      <div className="container flex h-8 items-center justify-between gap-3">
        <p className="truncate">
          <span className="font-medium text-white">{t('gov.ministry')}</span>
          <span className="mx-2 opacity-50">|</span>
          <span>NCPOR (Demo)</span>
        </p>
        <div className="flex items-center gap-1">
          <div role="group" aria-label="Text size" className="flex items-center">
            {sizes.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => setTextSize(s.v)}
                aria-label={s.aria}
                aria-pressed={textSize === s.v}
                className={cn('rounded px-1.5 py-0.5 hover:bg-white/10 focus-visible:outline-white', textSize === s.v && 'bg-white/15 text-white')}
              >
                {s.l}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleHighContrast}
            aria-pressed={highContrast}
            className={cn('ml-1 flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 focus-visible:outline-white', highContrast && 'bg-white/15 text-white')}
          >
            <Contrast className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{t('gov.contrast')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const NAV_ICONS: Partial<Record<DictKey, LucideIcon>> = {
  'nav.home': Home,
  'nav.explore': Search,
  'nav.expeditions': Ship,
  'nav.data': Database,
  'nav.gallery': Images,
  'nav.map': MapIcon,
  'nav.updates': Newspaper,
};

/**
 * Top-level nav item: icon only, with the label sliding out on hover or keyboard focus.
 * The label stays in the DOM (clipped) so screen readers still get a name for the link.
 */
const navItemClass = (active: boolean) =>
  cn(
    'group inline-flex h-9 shrink-0 items-center rounded-lg px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
    active && 'bg-[#e6effb] text-[#123b7a] hover:bg-[#dbe7f8] hover:text-[#123b7a] dark:bg-primary/15 dark:text-primary dark:hover:bg-primary/20 dark:hover:text-primary',
  );
const navIconClass = 'h-[18px] w-[18px] shrink-0 transition-transform duration-300 ease-out group-hover:-translate-x-0.5 group-focus-visible:-translate-x-0.5 group-data-[state=open]:-translate-x-0.5';
const navLabelClass =
  'max-w-0 overflow-hidden whitespace-nowrap text-[13px] font-medium opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-40 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-40 group-focus-visible:opacity-100 group-data-[state=open]:ml-1.5 group-data-[state=open]:max-w-40 group-data-[state=open]:opacity-100 motion-reduce:transition-none';

/** Roles that see the Data catalogue tab (visitors and students browse via Explore and Gallery). */
const DATA_ROLES: Role[] = ['admin', 'scientist', 'content_manager', 'researcher'];

/**
 * Main navigation for the current user: admins drop "Home" (the logo still links there) and the
 * Data catalogue is only offered to staff and researchers.
 */
function useMainNav() {
  const role = useAuthStore((s) => s.user?.role);
  const hydrated = useHydrated();
  return MAIN_NAV.filter((n) => {
    if (!hydrated) return n.key !== 'nav.data';
    if (n.key === 'nav.home') return role !== 'admin';
    if (n.key === 'nav.data') return !!role && DATA_ROLES.includes(role);
    return true;
  });
}

function ToolsMegaMenu({ active }: { active: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(navItemClass(active), 'data-[state=open]:bg-muted data-[state=open]:text-foreground')} title={t('nav.tools')}>
        <FlaskConical className={navIconClass} aria-hidden />
        <span className={navLabelClass}>{t('nav.tools')}</span>
        <ChevronDown className="ml-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[min(92vw,720px)] p-3">
        <div className="grid gap-1 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={tool.href}
              onClick={() => setOpen(false)}
              className="flex gap-3 rounded-md p-3 transition-colors hover:bg-muted focus-visible:bg-muted"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-polar-glacier/20 to-polar-teal/20 text-primary">
                <ToolIcon name={tool.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-medium">{tool.title}</span>
                <span className="block text-xs text-muted-foreground">{tool.description}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-2 border-t pt-2 text-right">
          <Link href="/tools" onClick={() => setOpen(false)} className="text-sm font-medium text-primary hover:underline">
            All scientific tools →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Map item: same icon-only pill as the other tabs, with the 2D / 3D choice in a small menu. */
function MapMenu({ active }: { active: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(navItemClass(active), 'data-[state=open]:bg-muted data-[state=open]:text-foreground')} title={t('nav.map')}>
        <MapIcon className={navIconClass} aria-hidden />
        <span className={navLabelClass}>{t('nav.map')}</span>
        <ChevronDown className="ml-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="center" className="w-64 p-2">
        <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Map view</p>
        {MAP_VIEWS.map((v) => {
          const Icon = v.id === '3d' ? Globe2 : MapIcon;
          return (
            <Link key={v.id} href={v.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-md p-2.5 transition-colors hover:bg-muted focus-visible:bg-muted">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-polar-glacier/20 to-polar-teal/20 text-primary" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{v.title}</span>
                <span className="block text-xs text-muted-foreground">{v.description}</span>
              </span>
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function SettingsMenu() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const { lowBandwidth, setLowBandwidth, lang, setLang } = useUiStore();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('common.language')}>
            <Languages />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t('common.language')} (UI)</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as UiLang)}>
            {UI_LANGS.map((l) => (
              <DropdownMenuRadioItem key={l.code} value={l.code} lang={l.code}>
                {l.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('common.theme')}>
            <Sun className="dark:hidden" />
            <Moon className="hidden dark:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t('common.theme')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Laptop className="mr-2 h-4 w-4" /> System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Display settings" className="relative">
            <Settings />
            {lowBandwidth && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-polar-amber" aria-hidden />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label htmlFor="lowbw" className="flex items-center gap-2">
                <WifiOff className="h-4 w-4" aria-hidden /> {t('common.lowBandwidth')}
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">Disables 3D, heavy animation and large visuals. Text-first UI with static previews.</p>
            </div>
            <Switch id="lowbw" checked={lowBandwidth} onCheckedChange={setLowBandwidth} />
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

const ALL_ROLES: Role[] = ['admin', 'scientist', 'content_manager', 'researcher', 'student'];

function UserMenu() {
  const t = useT();
  const router = useRouter();
  const hydrated = useHydrated();
  const { user, logout, switchRole } = useAuthStore();
  const { can } = useCan();

  if (!hydrated) return <div className="h-9 w-20 rounded-md bg-muted" aria-hidden />;
  if (!user)
    return (
      <Button asChild size="sm">
        <Link href="/login">{t('nav.login')}</Link>
      </Button>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted" aria-label={`Account menu for ${user.name}`}>
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <ChevronDown className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-2">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <Badge variant="secondary" className="mt-2">
            {ROLE_LABELS[user.role]}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push(dashboardPathFor(user.role))}>
          <LayoutDashboard /> {t('nav.dashboard')}
        </DropdownMenuItem>
        {user.role === 'admin' ? (
          <DropdownMenuItem onSelect={() => router.push('/dashboard/admin?tab=publishing')}>
            <PenSquare /> Publishing &amp; Insights
          </DropdownMenuItem>
        ) : can('use_studio') && (
          <DropdownMenuItem onSelect={() => router.push('/studio')}>
            <PenSquare /> {t('nav.studio')}
          </DropdownMenuItem>
        )}
        {can('upload') && (
          <DropdownMenuItem onSelect={() => router.push('/upload')}>
            <Upload /> {t('nav.upload')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => router.push('/dashboard/settings')}>
          <Settings /> {t('nav.settings')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Repeat /> Switch role (demo)
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={user.role}
              onValueChange={(v) => {
                switchRole(v as Role);
                toast.success(`Switched to ${ROLE_LABELS[v as Role]}`);
                router.push(dashboardPathFor(v as Role));
              }}
            >
              {ALL_ROLES.map((r) => (
                <DropdownMenuRadioItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logout();
            toast('Logged out');
            router.push('/');
          }}
        >
          <LogOut /> {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const t = useT();
  const nav = useMainNav();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-sm">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Wordmark />
        <nav aria-label="Mobile" className="mt-4 flex flex-col">
          {nav.map((n) => {
            const Icon = NAV_ICONS[n.key];
            const item = (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 font-medium hover:bg-muted">
                {Icon && <Icon className="h-4 w-4 text-primary" aria-hidden />} {t(n.key)}
              </Link>
            );
            if (n.key !== 'nav.map') return item;
            return (
              <div key={n.href}>
                {item}
                <div className="ml-9 flex flex-col">
                  {MAP_VIEWS.map((v) => (
                    <Link key={v.id} href={v.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                      {v.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('nav.tools')}</p>
          {TOOLS.map((tool) => (
            <Link key={tool.slug} href={tool.href} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
              <ToolIcon name={tool.icon} className="h-4 w-4 text-primary" /> {tool.title}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center gap-1 border-t pt-4 sm:hidden">
          <SettingsMenu />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SiteHeader() {
  const t = useT();
  const pathname = usePathname();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const user = useAuthStore((s) => s.user);
  const hydrated = useHydrated();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const nav = useMainNav();
  // Scientific Tools sits right after Map, wherever that lands in the (role-filtered) list.
  const mapAt = nav.findIndex((n) => n.key === 'nav.map');
  const toolsAt = mapAt === -1 ? nav.length : mapAt + 1;
  const link = (n: (typeof nav)[number]) => {
    const Icon = NAV_ICONS[n.key] ?? Home;
    const label = t(n.key);
    // The Map tab carries its own 2D / 3D menu instead of linking straight through.
    if (n.key === 'nav.map') return <MapMenu key={n.href} active={pathname === '/map' || pathname.startsWith('/tools/polar-map')} />;
    return (
      <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined} className={navItemClass(isActive(n.href))} title={label}>
        <Icon className={navIconClass} aria-hidden />
        <span className={navLabelClass}>{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40">
      <GovStrip />
      <div className="border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-16 items-center gap-2">
          <MobileNav />
          <Wordmark className="mr-2" subtitleClassName="lg:max-xl:hidden" />
          <nav aria-label="Main" className="no-scrollbar hidden min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto lg:flex xl:gap-3">
            {nav.slice(0, toolsAt).map(link)}
            <ToolsMegaMenu active={pathname.startsWith('/tools')} />
            {nav.slice(toolsAt).map(link)}
          </nav>
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="hidden gap-2 text-muted-foreground 2xl:inline-flex"
              aria-label="Open search and command palette"
            >
              <Search /> {t('nav.search')}
              <kbd className="rounded border bg-muted px-1.5 text-[10px]">Ctrl K</kbd>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCommandOpen(true)} className="2xl:hidden" aria-label="Open search">
              <Search />
            </Button>
            <div className="hidden items-center sm:flex">
              <SettingsMenu />
            </div>
            {hydrated && user && <NotificationBell />}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
