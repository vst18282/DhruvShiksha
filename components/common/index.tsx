import Link from 'next/link';
import * as React from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Globe2,
  Lock,
  LockOpen,
  Sparkles,
  UserCheck,
  Inbox,
} from 'lucide-react';
import type { AccessLevel, Attachment, Region, Status } from '@/types';
import { ACCESS_META, REGION_META, STATUS_META } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { cn, formatCompact } from '@/lib/utils';

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  as: As = 'h2',
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>}
        <As id={id} className={cn('font-semibold tracking-tight', As === 'h1' ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl')}>
          {title}
        </As>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden>
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'A snowstorm hit our servers. Please try again.',
  action,
  icon,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden>
        {icon ?? <AlertTriangle className="h-6 w-6" />}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status, className }: { status: Status | 'embargoed'; className?: string }) {
  if (status === 'embargoed')
    return (
      <Badge variant="warning" className={className}>
        <Clock aria-hidden /> Embargoed
      </Badge>
    );
  const m = STATUS_META[status];
  return (
    <Badge variant={m.variant} className={className}>
      {m.label}
    </Badge>
  );
}

export function AiBadge({ className, label = 'AI-generated draft' }: { className?: string; label?: string }) {
  return (
    <Badge variant="aurora" className={cn('border border-polar-violet/30', className)}>
      <Sparkles aria-hidden /> {label}
    </Badge>
  );
}

export function AccessBadge({ level, className }: { level: AccessLevel; className?: string }) {
  const Icon = level === 'public' ? LockOpen : level === 'registered' ? UserCheck : level === 'embargoed' ? Clock : Lock;
  const variant = level === 'public' ? 'success' : level === 'registered' ? 'secondary' : level === 'embargoed' ? 'warning' : 'destructive';
  return (
    <Badge variant={variant} className={className} title={ACCESS_META[level].description}>
      <Icon aria-hidden /> {ACCESS_META[level].label}
    </Badge>
  );
}

export function RegionBadge({ region, className }: { region: Region; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', REGION_META[region].badge, className)}>
      <Globe2 className="h-3 w-3" aria-hidden />
      {REGION_META[region].label}
    </span>
  );
}

export function Stat({
  label,
  value,
  icon,
  delta,
  className,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  delta?: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {icon && <span aria-hidden className="text-primary">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{typeof value === 'number' ? formatCompact(value) : value}</span>
        {typeof delta === 'number' && (
          <span className={cn('text-xs font-medium', delta >= 0 ? 'text-success' : 'text-destructive')}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function Breadcrumbs({ items, className }: { items: { label: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-4 text-sm text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {it.href && i < items.length - 1 ? (
              <Link href={it.href} className="hover:text-foreground hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className="line-clamp-1 text-foreground">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Timeline({ items, className }: { items: { date: string; title: string; text?: string }[]; className?: string }) {
  return (
    <ol className={cn('relative space-y-6 border-l-2 border-primary/30 pl-6', className)}>
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{it.date}</p>
          <p className="font-medium">{it.title}</p>
          {it.text && <p className="mt-1 text-sm text-muted-foreground">{it.text}</p>}
        </li>
      ))}
    </ol>
  );
}

const FILE_ICONS: Record<Attachment['kind'], React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  doc: FileText,
  csv: FileSpreadsheet,
  zip: FileArchive,
  image: FileImage,
  video: FileVideo,
};

export function FileCard({
  file,
  actions,
  className,
}: {
  file: Attachment;
  actions?: React.ReactNode;
  className?: string;
}) {
  const Icon = FILE_ICONS[file.kind];
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border bg-card p-3', className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary" aria-hidden>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs uppercase text-muted-foreground">
          {file.kind} · {file.sizeKb > 1024 ? `${(file.sizeKb / 1024).toFixed(1)} MB` : `${file.sizeKb} KB`}
        </p>
      </div>
      {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warning" className={cn('uppercase tracking-wide', className)}>
      Demo data
    </Badge>
  );
}
