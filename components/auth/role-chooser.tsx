'use client';

import { GraduationCap, Microscope, PenSquare, ShieldCheck, Telescope, type LucideIcon } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';
import type { Role } from '@/types';
import { cn } from '@/lib/utils';

const ROLE_META: Record<Role, { icon: LucideIcon; blurb: string }> = {
  admin: { icon: ShieldCheck, blurb: 'Users, moderation and publishing insights' },
  scientist: { icon: Microscope, blurb: 'Datasets, reports and expedition science' },
  content_manager: { icon: PenSquare, blurb: 'Outreach, media and the Content Studio' },
  researcher: { icon: Telescope, blurb: 'Partner access to catalogues and DOIs' },
  student: { icon: GraduationCap, blurb: 'Learning paths, quizzes and badges' },
};

export const ROLE_ORDER: Role[] = ['admin', 'scientist', 'content_manager', 'researcher', 'student'];

/**
 * "Choose user type" column shown to the left of the login / sign-up fields. Behaves as a radio
 * group so the keyboard and screen-reader experience matches the visual one.
 */
export function RoleChooser({
  value,
  onChange,
  name,
  description,
  className,
}: {
  value: Role | null;
  onChange: (role: Role) => void;
  name: string;
  description?: string;
  className?: string;
}) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="text-sm font-semibold">Choose user type</legend>
      {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
      <div className="mt-3 space-y-2">
        {ROLE_ORDER.map((role) => {
          const { icon: Icon, blurb } = ROLE_META[role];
          const active = value === role;
          return (
            <label
              key={role}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/70',
                active ? 'border-primary bg-primary/10 ring-1 ring-primary/40' : 'bg-card',
              )}
            >
              <input
                type="radio"
                name={name}
                value={role}
                checked={active}
                onChange={() => onChange(role)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{ROLE_LABELS[role]}</span>
                <span className="block text-xs leading-5 text-muted-foreground">{blurb}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
