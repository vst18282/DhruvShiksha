import { Check } from 'lucide-react';
import type { Status } from '@/types';
import { cn } from '@/lib/utils';

const STEPS: { id: Status; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'in_review', label: 'In review' },
  { id: 'approved', label: 'Approved' },
  { id: 'published', label: 'Published' },
];

/** Draft → In review → Approved → Published progress tracker. */
export function StatusStepper({ status }: { status: Status }) {
  const idx = status === 'scheduled' ? 2 : status === 'changes_requested' ? 1 : STEPS.findIndex((s) => s.id === status);
  const bad = status === 'rejected' || status === 'changes_requested';
  return (
    <ol className="flex items-center gap-1" aria-label={`Status: ${status.replace('_', ' ')}`}>
      {STEPS.map((s, i) => {
        const done = i < idx || (i === idx && status === 'published');
        const cur = i === idx;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-1">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                done && 'border-success bg-success text-success-foreground',
                cur && !done && (bad ? 'border-polar-amber bg-polar-amber/20' : 'border-primary bg-primary/15 text-primary'),
              )}
              aria-current={cur ? 'step' : undefined}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={cn('hidden text-xs sm:inline', cur ? 'font-medium' : 'text-muted-foreground')}>{cur && status === 'changes_requested' ? 'Changes requested' : cur && status === 'scheduled' ? 'Scheduled' : s.label}</span>
            {i < STEPS.length - 1 && <span className={cn('h-0.5 flex-1 rounded', i < idx ? 'bg-success' : 'bg-border')} aria-hidden />}
          </li>
        );
      })}
      {status === 'rejected' && <li className="ml-2 text-xs font-medium text-destructive">Rejected</li>}
    </ol>
  );
}
