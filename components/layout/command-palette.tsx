'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useTheme } from 'next-themes';
import { ArrowRight, FileText, Laptop, Moon, Repeat, Search, Sun, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUiStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { MAIN_NAV, TOOLS } from '@/lib/nav';
import { useT } from '@/lib/i18n';
import { SearchService } from '@/lib/search';
import { CONTENT_TYPE_LABELS, ROLE_LABELS } from '@/lib/constants';
import { dashboardPathFor } from '@/lib/permissions';
import type { Role } from '@/types';

const ROLES: Role[] = ['admin', 'scientist', 'content_manager', 'researcher', 'student'];

/** Global Ctrl/Cmd+K palette: navigate, search the archive, switch theme or demo role. */
export function CommandPalette() {
  const t = useT();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { commandOpen, setCommandOpen, lowBandwidth, setLowBandwidth, addRecentSearch } = useUiStore();
  const { user, switchRole } = useAuthStore();
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(!useUiStore.getState().commandOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCommandOpen]);

  const results = useMemo(() => (q.trim().length > 1 ? SearchService.search(q).results.slice(0, 6) : []), [q]);

  const go = (href: string) => {
    setCommandOpen(false);
    setQ('');
    router.push(href);
  };

  const itemCls =
    'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-muted data-[selected=true]:bg-muted [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground';
  const groupCls = 'px-2 py-1.5 text-xs font-semibold text-muted-foreground [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1.5';

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0" hideClose>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command shouldFilter={false} label="Command palette" className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Command.Input
              value={q}
              onValueChange={setQ}
              placeholder="Search the archive or type a command…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="p-6 text-center text-sm text-muted-foreground">No results.</Command.Empty>
            {q.trim().length > 1 && (
              <Command.Group heading="Archive" className={groupCls}>
                <Command.Item
                  value={`search-${q}`}
                  onSelect={() => {
                    addRecentSearch(q);
                    go(`/explore?q=${encodeURIComponent(q)}`);
                  }}
                  className={itemCls}
                >
                  <Search /> Search “{q}” in Explore
                </Command.Item>
                {results.map((r) => (
                  <Command.Item key={r.item.id} value={r.item.id} onSelect={() => go(r.href)} className={itemCls}>
                    <FileText />
                    <span className="line-clamp-1 flex-1 font-normal text-foreground">{r.item.title}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{CONTENT_TYPE_LABELS[r.item.type].singular}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            <Command.Group heading="Navigate" className={groupCls}>
              {[...MAIN_NAV.map((n) => ({ label: t(n.key), href: n.href })), ...TOOLS.map((x) => ({ label: x.title, href: x.href }))]
                .filter((n) => !q || n.label.toLowerCase().includes(q.toLowerCase()))
                .map((n) => (
                  <Command.Item key={n.href} value={`nav-${n.href}`} onSelect={() => go(n.href)} className={itemCls}>
                    <ArrowRight /> <span className="font-normal text-foreground">{n.label}</span>
                  </Command.Item>
                ))}
            </Command.Group>
            <Command.Group heading="Preferences" className={groupCls}>
              {[
                { label: 'Light theme', icon: Sun, run: () => setTheme('light') },
                { label: 'Dark theme', icon: Moon, run: () => setTheme('dark') },
                { label: 'System theme', icon: Laptop, run: () => setTheme('system') },
                { label: `${lowBandwidth ? 'Disable' : 'Enable'} low-bandwidth mode`, icon: WifiOff, run: () => setLowBandwidth(!lowBandwidth) },
              ]
                .filter((c) => !q || c.label.toLowerCase().includes(q.toLowerCase()))
                .map((c) => (
                  <Command.Item
                    key={c.label}
                    value={c.label}
                    onSelect={() => {
                      c.run();
                      setCommandOpen(false);
                    }}
                    className={itemCls}
                  >
                    <c.icon /> <span className="font-normal text-foreground">{c.label}</span>
                  </Command.Item>
                ))}
            </Command.Group>
            {user && (
              <Command.Group heading="Switch role (demo)" className={groupCls}>
                {ROLES.filter((r) => !q || ROLE_LABELS[r].toLowerCase().includes(q.toLowerCase()) || 'role'.includes(q.toLowerCase())).map((r) => (
                  <Command.Item
                    key={r}
                    value={`role-${r}`}
                    onSelect={() => {
                      switchRole(r);
                      toast.success(`Switched to ${ROLE_LABELS[r]}`);
                      go(dashboardPathFor(r));
                    }}
                    className={itemCls}
                  >
                    <Repeat /> <span className="font-normal text-foreground">{ROLE_LABELS[r]}</span>
                    {user.role === r && <span className="ml-auto text-[11px] font-normal">current</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
