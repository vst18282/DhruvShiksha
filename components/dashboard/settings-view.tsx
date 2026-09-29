'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { RefreshCcw } from 'lucide-react';
import type { UiLang } from '@/types';
import { DashHeader } from './shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import { useUiStore, type TextSize } from '@/store/ui';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';
import { useInvalidate } from '@/hooks/use-queries';
import { ROLE_LABELS } from '@/lib/constants';

export function SettingsView() {
  const { user, updateProfile } = useAuthStore();
  const ui = useUiStore();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name ?? '');
  const [org, setOrg] = useState(user?.org ?? '');
  const reset = useDataStore((s) => s.reset);
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const prefs: { k: keyof typeof ui.notifPrefs; l: string }[] = [
    { k: 'email', l: 'Email notifications (demo)' },
    { k: 'approvals', l: 'Approval and review updates' },
    { k: 'access', l: 'Access request updates' },
    { k: 'learning', l: 'Learning reminders and badges' },
    { k: 'digest', l: 'Weekly digest' },
  ];
  return (
    <>
      <DashHeader title="Settings" description="Profile, language, accessibility and notifications." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border bg-card p-5" aria-labelledby="prof">
          <h2 id="prof" className="font-semibold">Profile</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length < 2) return toast.error('Name is too short');
              updateProfile({ name: name.trim(), org: org.trim() });
              toast.success('Profile saved');
            }}
          >
            <div className="space-y-1"><Label htmlFor="s-name">Display name</Label><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="s-org">Organisation</Label><Input id="s-org" value={org} onChange={(e) => setOrg(e.target.value)} /></div>
            <p className="text-sm text-muted-foreground">Email: {user.email} · Role: {ROLE_LABELS[user.role]}</p>
            <Button type="submit">Save profile</Button>
          </form>
        </section>
        <section className="space-y-4 rounded-lg border bg-card p-5" aria-labelledby="disp">
          <h2 id="disp" className="font-semibold">Language & display</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="s-lang">Interface language</Label>
              <Select value={ui.lang} onValueChange={(v) => ui.setLang(v as UiLang)}>
                <SelectTrigger id="s-lang"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="hi">हिन्दी</SelectItem><SelectItem value="mr">मराठी</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-theme">Theme</Label>
              <Select value={theme ?? 'system'} onValueChange={setTheme}>
                <SelectTrigger id="s-theme"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem><SelectItem value="system">System</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-size">Text size</Label>
              <Select value={ui.textSize} onValueChange={(v) => ui.setTextSize(v as TextSize)}>
                <SelectTrigger id="s-size"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="sm">Small (A-)</SelectItem><SelectItem value="md">Default (A)</SelectItem><SelectItem value="lg">Large (A+)</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="s-hc">High contrast</Label><Switch id="s-hc" checked={ui.highContrast} onCheckedChange={ui.toggleHighContrast} /></div>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="s-lb">Low-bandwidth mode</Label><Switch id="s-lb" checked={ui.lowBandwidth} onCheckedChange={ui.setLowBandwidth} /></div>
          <p className="text-xs text-muted-foreground">Reduced motion follows your operating-system setting automatically.</p>
        </section>
        <section className="space-y-3 rounded-lg border bg-card p-5" aria-labelledby="notif">
          <h2 id="notif" className="font-semibold">Notification preferences</h2>
          {prefs.map((p) => (
            <div key={p.k} className="flex items-center justify-between gap-3">
              <Label htmlFor={`n-${p.k}`}>{p.l}</Label>
              <Switch id={`n-${p.k}`} checked={ui.notifPrefs[p.k]} onCheckedChange={(v) => ui.setNotifPref(p.k, v)} />
            </div>
          ))}
        </section>
        {user.role === 'admin' && (
          <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-5" aria-labelledby="rst">
            <h2 id="rst" className="flex items-center gap-2 font-semibold"><RefreshCcw className="h-4 w-4" aria-hidden /> Reset demo data</h2>
            <p className="mt-1 text-sm text-muted-foreground">Clears uploads, drafts, approvals, role changes, bookmarks and requests made in this browser.</p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="destructive" className="mt-3">Reset demo data…</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Reset all demo data?</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={() => { reset(); useUserStore.setState(useUserStore.getInitialState()); invalidate(); setOpen(false); toast.success('Demo data reset'); }}>Reset</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>
        )}
      </div>
    </>
  );
}
