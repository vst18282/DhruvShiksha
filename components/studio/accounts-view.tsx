'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Link2Off, Lock, Plug, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { PlatformId, SocialAccount } from '@/types';
import { PlatformIcon, PlatformTile } from './platform-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { PLATFORM_META } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';

const PLATFORMS = Object.keys(PLATFORM_META) as PlatformId[];

/** Mock OAuth: choose platform → fake authorise screen → account added (persisted). */
function ConnectDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<PlatformId>('x');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('Outreach');
  const [busy, setBusy] = useState(false);
  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(() => { setStep(0); setHandle(''); setName(''); }, 200);
  };
  const authorise = async () => {
    if (handle.trim().length < 3) return toast.error('Enter an account handle');
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1200));
    await api.saveAccount({ id: `acc-${platform}-${Date.now().toString(36)}`, platform, handle: handle.startsWith('@') || platform === 'facebook' || platform === 'linkedin' || platform === 'whatsapp' ? handle : `@${handle}`, displayName: name || handle, followers: Math.round(200 + Math.random() * 5000), connected: true, purpose, connectedAt: new Date().toISOString().slice(0, 10) });
    setBusy(false);
    setStep(2);
    onDone();
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        {step === 0 && (
          <>
            <DialogHeader><DialogTitle>Connect an account</DialogTitle><DialogDescription>Choose a platform. You can connect several accounts per platform.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => { setPlatform(p); setStep(1); }} className="flex items-center gap-2 rounded-lg border p-3 text-left text-sm hover:bg-muted">
                  <PlatformTile id={p} className="h-8 w-8" iconClassName="h-4 w-4" /> {PLATFORM_META[p].label}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><PlatformIcon id={platform} className="h-6 w-6" /> Authorise PolarVerse (demo)</DialogTitle>
              <DialogDescription>This is a simulated OAuth consent screen — no data leaves your browser.</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-medium">PolarVerse Studio would like to:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> Publish posts on your behalf</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> Read basic profile and follower count</li>
                <li className="flex items-center gap-2"><Lock className="h-4 w-4" aria-hidden /> It will not read direct messages</li>
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="c-handle">Account handle</Label><Input id="c-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@ncpor_newaccount" /></div>
              <div className="space-y-1"><Label htmlFor="c-name">Display name</Label><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="NCPOR Kids" /></div>
              <div className="space-y-1 sm:col-span-2"><Label htmlFor="c-purpose">Purpose</Label><Input id="c-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={authorise} loading={busy}><ShieldCheck /> Authorise</Button>
            </DialogFooter>
          </>
        )}
        {step === 2 && (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
            <p className="mt-2 text-lg font-semibold">Account connected</p>
            <p className="text-sm text-muted-foreground">It now appears in the composer under {PLATFORM_META[platform].label}.</p>
            <Button className="mt-4" onClick={() => close(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AccountsView() {
  const { data, isPending } = useApi(['accounts'], api.getAccounts);
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const refresh = () => invalidate([['accounts'], ['audit']]);
  const toggle = async (a: SocialAccount) => {
    await api.saveAccount({ ...a, connected: !a.connected });
    toast.success(a.connected ? `${a.handle} revoked` : `${a.handle} reconnected`);
    refresh();
  };
  const remove = async (a: SocialAccount) => {
    await api.removeAccount(a.id);
    toast.success(`${a.handle} removed`);
    refresh();
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Social accounts</h1>
          <p className="text-sm text-muted-foreground">Connect several accounts per platform. The same post can go to many accounts at once.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus /> Connect account</Button>
      </div>
      {isPending ? <TableSkeleton rows={6} /> : (
        <div className="space-y-5">
          {PLATFORMS.filter((p) => data?.some((a) => a.platform === p)).map((p) => (
            <section key={p} aria-labelledby={`acc-${p}`}>
              <h2 id={`acc-${p}`} className="mb-2 flex items-center gap-2 text-sm font-semibold"><PlatformIcon id={p} /> {PLATFORM_META[p].label}</h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {data!.filter((a) => a.platform === p).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
                    <PlatformTile id={a.platform} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.displayName}</p>
                      <p className="text-xs text-muted-foreground">{a.handle} · {formatNumber(a.followers)} followers · {a.purpose}</p>
                      <p className="text-[11px] text-muted-foreground">Connected {a.connectedAt}</p>
                    </div>
                    <Badge variant={a.connected ? 'success' : 'muted'}>{a.connected ? 'Connected' : 'Revoked'}</Badge>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => toggle(a)}>{a.connected ? <><Link2Off /> Revoke</> : <><Plug /> Reconnect</>}</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(a)} aria-label={`Remove ${a.handle}`}><Trash2 /> Remove</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <ConnectDialog open={open} onOpenChange={setOpen} onDone={refresh} />
    </div>
  );
}
