'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FlaskConical, Megaphone, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/misc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GRANT_LABELS, WORKFLOW_OPTIONS, grantKey, resolveCell, type WorkflowOption } from '@/lib/permissions';
import { LANGUAGES } from '@/lib/constants';
import { VISIBILITY_PRESETS, visibilityLabel } from '@/lib/visibility';
import { usePermissionStore } from '@/store/permissions';
import { useDataStore, type SystemSettings } from '@/store/data';
import { resetAllDemoData } from '@/store/rehydrate';
import { useInvalidate } from '@/hooks/use-queries';
import { PermissionEditor } from './permission-editor';
import { EmbargoBox } from './embargo-box';
import { useAuditLog } from './use-audit-log';

function WorkflowRow({ o }: { o: WorkflowOption }) {
  const { workflow, overrides, setWorkflow, clearOverride } = usePermissionStore();
  const log = useAuditLog();
  const on = workflow[o.key];
  const cell = o.cell ? resolveCell(o.cell.action, o.role, workflow, overrides) : null;
  const overridden = !!cell && cell.source === 'override' && grantKey(cell.value) !== grantKey(cell.workflowValue!);
  const id = `wf-${o.key}`;
  return (
    <li className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <Label htmlFor={id} className="leading-snug">
          {o.label}
          <span className="block text-xs font-normal text-muted-foreground">{o.help}</span>
        </Label>
        <Switch
          id={id}
          checked={on}
          onCheckedChange={(v) => {
            setWorkflow({ [o.key]: v });
            log('changed workflow', 'workflow', o.label, v ? 'Turned on' : 'Turned off');
          }}
        />
      </div>
      {overridden && cell && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-polar-amber/10 px-2.5 py-1.5 text-xs" role="status">
          <span>
            Overridden in the permission table: currently <strong>{GRANT_LABELS[grantKey(cell.value)]}</strong> (workflow says {GRANT_LABELS[grantKey(cell.workflowValue!)]}).
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              clearOverride(o.cell!.action, o.role);
              log('reset permission', 'permission', o.label, 'Permission table edit removed; follows the workflow option again.');
            }}
          >
            Use workflow setting
          </Button>
        </div>
      )}
    </li>
  );
}

function WorkflowSection() {
  const groups: { role: WorkflowOption['role']; title: string; icon: React.ReactNode }[] = [
    { role: 'scientist', title: 'Scientists', icon: <FlaskConical className="h-4 w-4 text-primary" aria-hidden /> },
    { role: 'content_manager', title: 'Content managers', icon: <Megaphone className="h-4 w-4 text-primary" aria-hidden /> },
  ];
  return (
    <section aria-labelledby="wf-h" className="space-y-4 rounded-lg border bg-card p-5 lg:col-span-2">
      <div>
        <h2 id="wf-h" className="font-semibold">
          Workflow
        </h2>
        <p className="text-sm text-muted-foreground">
          Who creates, reviews and publishes. Each option updates the matching cells in Roles &amp; permissions; a manual edit in the permission table below takes priority.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.role} className="rounded-md border p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              {g.icon} {g.title}
            </h3>
            <ul className="divide-y">
              {WORKFLOW_OPTIONS.filter((o) => o.role === g.role).map((o) => (
                <WorkflowRow key={o.key} o={o} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ToggleRow({ id, label, help, k }: { id: string; label: string; help: string; k: keyof Pick<SystemSettings, 'allowDownloads' | 'enableReactions' | 'enableReporting' | 'showShare'> }) {
  const value = useDataStore((s) => s.settings[k]);
  const updateSettings = useDataStore((s) => s.updateSettings);
  const log = useAuditLog();
  return (
    <div className="flex items-start justify-between gap-3">
      <Label htmlFor={id} className="leading-snug">
        {label}
        <span className="block text-xs font-normal text-muted-foreground">{help}</span>
      </Label>
      <Switch
        id={id}
        checked={value}
        onCheckedChange={(v) => {
          updateSettings({ [k]: v });
          log('changed setting', 'settings', label, v ? 'On' : 'Off');
        }}
      />
    </div>
  );
}

function ContentSection() {
  const settings = useDataStore((s) => s.settings);
  const updateSettings = useDataStore((s) => s.updateSettings);
  const log = useAuditLog();
  const presetId = VISIBILITY_PRESETS.find((p) => visibilityLabel(p.value) === visibilityLabel(settings.defaultVisibility ?? undefined))?.id ?? 'all';
  return (
    <section aria-labelledby="ce-h" className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h2 id="ce-h" className="font-semibold">
          Content &amp; engagement
        </h2>
        <p className="text-sm text-muted-foreground">Portal-wide switches. Per-role download rights are in the permission table (“Download open files”, “Download registered-only files”).</p>
      </div>
      <ToggleRow id="ce-dl" k="allowDownloads" label="Allow downloads" help="Turn off to pause all file downloads (owners and admins keep access)." />
      <ToggleRow id="ce-react" k="enableReactions" label="Likes & dislikes on public pages" help="Signed-in users can like or dislike content and posts." />
      <ToggleRow id="ce-report" k="enableReporting" label="Allow reporting problems" help="Signed-in users can report incorrect, outdated or broken content." />
      <ToggleRow id="ce-share" k="showShare" label="Show share buttons" help="Share to social platforms, WhatsApp and email." />
      <div className="space-y-1">
        <Label htmlFor="ce-vis">Default visibility for new uploads & posts</Label>
        <Select
          value={presetId}
          onValueChange={(id) => {
            const p = VISIBILITY_PRESETS.find((x) => x.id === id)!;
            updateSettings({ defaultVisibility: p.value ?? null });
            log('changed setting', 'settings', 'Default visibility', p.label);
          }}
        >
          <SelectTrigger id="ce-vis">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITY_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Content managers and admins can change visibility per item at any time.</p>
      </div>
    </section>
  );
}

function DefaultsSection() {
  const settings = useDataStore((s) => s.settings);
  const updateSettings = useDataStore((s) => s.updateSettings);
  const log = useAuditLog();
  const set = (patch: Partial<SystemSettings>, label: string, value: string) => {
    updateSettings(patch);
    log('changed setting', 'settings', label, value);
  };
  return (
    <section aria-labelledby="defs-h" className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h2 id="defs-h" className="font-semibold">
          Defaults
        </h2>
        <p className="text-sm text-muted-foreground">Pre-filled values in the Upload Centre and Content Studio.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="lic">Default licence</Label>
        <Select value={settings.defaultLicence} onValueChange={(v) => set({ defaultLicence: v }, 'Default licence', v)}>
          <SelectTrigger id="lic">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['CC-BY-4.0', 'CC-BY-NC-4.0', 'CC0', 'NCPOR-Restricted'].map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="tone">AI default tone</Label>
        <Select value={settings.aiDefaultTone} onValueChange={(v) => set({ aiDefaultTone: v }, 'AI default tone', v)}>
          <SelectTrigger id="tone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['Formal', 'Friendly', 'Inspiring', 'Educational', 'News/Announcement', 'Playful'].map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="alang">AI default language</Label>
        <Select value={settings.aiDefaultLanguage} onValueChange={(v) => set({ aiDefaultLanguage: v }, 'AI default language', LANGUAGES.find((l) => l.code === v)?.label ?? v)}>
          <SelectTrigger id="alang">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

function ResetSection() {
  const invalidate = useInvalidate();
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 lg:col-span-2" aria-labelledby="reset-h">
      <h2 id="reset-h" className="flex items-center gap-2 font-semibold">
        <RefreshCcw className="h-4 w-4" aria-hidden /> Reset demo data
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Restores seed data: removes uploads, drafts, approvals, permission and workflow changes, reactions, reports, bookmarks and access requests made in this browser. This cannot be undone.
      </p>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="mt-3">
            Reset demo data…
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all demo data?</DialogTitle>
            <DialogDescription>Everything created during this demo session will be cleared. Your login stays active.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetAllDemoData();
                invalidate();
                setConfirm(false);
                toast.success('Demo data reset');
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function SystemTab() {
  // Deep link from Roles & permissions › Change (…?tab=system#permissions).
  useEffect(() => {
    // Checked after a tick: the router may update the URL (and its hash) after this tab mounts.
    const t = setTimeout(() => {
      if (window.location.hash === '#permissions') document.getElementById('permissions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WorkflowSection />
      <PermissionEditor />
      <ContentSection />
      <DefaultsSection />
      <EmbargoBox />
      <ResetSection />
    </div>
  );
}
