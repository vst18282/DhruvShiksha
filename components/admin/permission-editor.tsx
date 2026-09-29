'use client';

import { AlertTriangle, Lock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ACTIONS,
  ACTION_LABELS,
  GRANT_LABELS,
  GRANT_OPTIONS,
  SUBJECTS,
  WORKFLOW_OPTIONS,
  grantKey,
  parseGrant,
  resolveCell,
  type Action,
  type Subject,
} from '@/lib/permissions';
import { BASE_PERMISSIONS, workflowCell } from '@/lib/permissions-core';
import { usePermissionStore } from '@/store/permissions';
import { cn } from '@/lib/utils';
import { GrantValue, SUBJECT_LABELS, SourceLegend, SourceMarker } from './permission-bits';
import { useAuditLog } from './use-audit-log';

/**
 * Per-cell permission editor. A cell's value comes from (in order): the default table,
 * a workflow option, then an edit made here. Edits always win over workflow options until reset.
 */
export function PermissionEditor() {
  const { workflow, overrides, setOverride, clearOverride, clearAllOverrides } = usePermissionStore();
  const log = useAuditLog();

  /** Value the cell would have without a manual edit. */
  const inherited = (a: Action, s: Subject) => workflowCell(a, s, workflow)?.value ?? BASE_PERMISSIONS[a][s];

  const change = (a: Action, s: Subject, key: string) => {
    const v = parseGrant(key);
    if (grantKey(v) === grantKey(inherited(a, s))) clearOverride(a, s);
    else setOverride(a, s, v);
    log('changed permission', 'permission', `${ACTION_LABELS[a]} · ${SUBJECT_LABELS[s]}`, `Set to “${GRANT_LABELS[key]}” in the permission table.`);
  };

  const conflicts = ACTIONS.flatMap((a) =>
    SUBJECTS.map((s) => ({ a, s, c: resolveCell(a, s, workflow, overrides) })).filter(({ c }) => c.source === 'override' && c.workflowKey && grantKey(c.value) !== grantKey(c.workflowValue!)),
  );
  const editCount = Object.values(overrides).reduce((n, r) => n + Object.keys(r ?? {}).length, 0);

  return (
    <section id="permissions" aria-labelledby="perm-h" className="scroll-mt-28 space-y-3 rounded-lg border bg-card p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="perm-h" className="font-semibold">
            Permission table
          </h2>
          <p className="text-sm text-muted-foreground">Fine-tune any cell. Edits here override the workflow options above; reset a cell to follow the workflow again.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!editCount}
          onClick={() => {
            clearAllOverrides();
            log('reset permission table', 'permission', 'All edited cells', `${editCount} edit(s) removed; cells follow defaults and workflow options again.`);
            toast.success('Permission edits cleared');
          }}
        >
          <RotateCcw /> Reset all edits{editCount ? ` (${editCount})` : ''}
        </Button>
      </div>

      {conflicts.length > 0 && (
        <div role="status" className="flex gap-2 rounded-md border border-polar-amber/40 bg-polar-amber/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-polar-amber" aria-hidden />
          <div>
            <p className="font-medium">
              {conflicts.length} edit{conflicts.length > 1 ? 's' : ''} override{conflicts.length === 1 ? 's' : ''} a workflow option
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {conflicts.map(({ a, s, c }) => (
                <li key={`${a}-${s}`}>
                  {ACTION_LABELS[a]} · {SUBJECT_LABELS[s]}: workflow “{WORKFLOW_OPTIONS.find((o) => o.key === c.workflowKey)?.label}” says {GRANT_LABELS[grantKey(c.workflowValue!)]}, table says {GRANT_LABELS[grantKey(c.value)]}.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <SourceLegend />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-sm">
          <caption className="sr-only">Editable permission table</caption>
          <thead className="border-b bg-muted/50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">
                Action
              </th>
              {SUBJECTS.map((s) => (
                <th key={s} scope="col" className="px-2 py-2 text-center">
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
                  const label = `${ACTION_LABELS[a]} for ${SUBJECT_LABELS[s]}`;
                  if (c.source === 'locked')
                    return (
                      <td key={s} className="px-2 py-2 text-center" title="Locked: keeps the portal usable and the admin in control">
                        <span className="inline-flex items-center gap-1">
                          <GrantValue g={c.value} />
                          <Lock className="h-3 w-3 text-muted-foreground" aria-label="Locked" />
                        </span>
                      </td>
                    );
                  return (
                    <td key={s} className={cn('px-2 py-1.5 text-center', c.source === 'override' && 'bg-polar-amber/10')}>
                      <div className="flex items-center justify-center gap-1">
                        <SourceMarker source={c.source} />
                        <select
                          value={grantKey(c.value)}
                          onChange={(e) => change(a, s, e.target.value)}
                          aria-label={label}
                          className="h-8 max-w-[8.5rem] rounded-md border border-input bg-background px-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {GRANT_OPTIONS[a].map((g) => (
                            <option key={grantKey(g)} value={grantKey(g)}>
                              {GRANT_LABELS[grantKey(g)]}
                            </option>
                          ))}
                        </select>
                        {c.source === 'override' && (
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Reset ${label} to ${c.workflowKey ? 'workflow' : 'default'} value`}
                            title={`Reset to ${c.workflowKey ? 'workflow' : 'default'} value (${GRANT_LABELS[grantKey(inherited(a, s))]})`}
                            onClick={() => {
                              clearOverride(a, s);
                              log('reset permission', 'permission', `${ACTION_LABELS[a]} · ${SUBJECT_LABELS[s]}`, `Back to “${GRANT_LABELS[grantKey(inherited(a, s))]}”.`);
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Locked cells: everyone can view public content, visitors can only read (open-file downloads are adjustable), and admins always keep user management, the audit log and visibility control.
      </p>
    </section>
  );
}
