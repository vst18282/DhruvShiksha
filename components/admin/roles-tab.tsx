'use client';

import { useRouter } from 'next/navigation';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACTIONS, ACTION_LABELS, SUBJECTS, resolveCell, scienceReviewEnforced, useCan } from '@/lib/permissions';
import { usePermissionStore } from '@/store/permissions';
import { GrantValue, SOURCE_META, SUBJECT_LABELS, SourceLegend, SourceMarker } from './permission-bits';

/**
 * Read-only view of the effective permission table (defaults → workflow options → edits).
 * Changes are made in System settings; the Change button jumps there.
 */
export function RolesTab() {
  const router = useRouter();
  const { workflow, table } = useCan();
  const overrides = usePermissionStore((s) => s.overrides);
  const edited = Object.values(overrides).reduce((n, r) => n + Object.keys(r ?? {}).length, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Roles & permissions</h2>
          <p className="text-sm text-muted-foreground">
            What each role can do right now. {edited ? `${edited} cell${edited > 1 ? 's' : ''} edited in the permission table.` : 'No manual edits.'}{' '}
            {scienceReviewEnforced(workflow, table) ? 'Science review is required before approval.' : ''}
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/admin?tab=system#permissions')}>
          <Settings2 /> Change
        </Button>
      </div>
      <SourceLegend />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <caption className="sr-only">Effective permission matrix (read-only)</caption>
          <thead className="border-b bg-muted/50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">
                Action
              </th>
              {SUBJECTS.map((s) => (
                <th key={s} scope="col" className="px-3 py-2 text-center">
                  {SUBJECT_LABELS[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTIONS.map((a) => (
              <tr key={a} className="border-b last:border-0">
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {ACTION_LABELS[a]}
                </th>
                {SUBJECTS.map((s) => {
                  const c = resolveCell(a, s, workflow, overrides);
                  return (
                    <td key={s} className="relative px-3 py-2 text-center" title={SOURCE_META[c.source].label || undefined}>
                      <GrantValue g={c.value} />
                      <span className="absolute right-1.5 top-1.5">
                        <SourceMarker source={c.source} />
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
