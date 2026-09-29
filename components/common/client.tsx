'use client';

/** Client-side reusable primitives: Pagination, MultiSelect, DataTable. */
import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  const pages: (number | '…')[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1', className)}>
      <Button variant="outline" size="icon" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft />
      </Button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={i} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={i}
            variant={p === page ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </Button>
        ),
      )}
      <Button variant="outline" size="icon" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
        <ChevronRight />
      </Button>
    </nav>
  );
}

export function MultiSelect<T extends string>({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  const [q, setQ] = React.useState('');
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <span className="flex flex-wrap gap-1">
            {value.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {value.slice(0, 3).map((v) => (
              <span key={v} className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                {options.find((o) => o.value === v)?.label ?? v}
              </span>
            ))}
            {value.length > 3 && <span className="text-xs text-muted-foreground">+{value.length - 3}</span>}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {options.length > 6 && (
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="mb-2 h-8" aria-label={`Filter ${label}`} />
        )}
        <ul role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-60 overflow-y-auto">
          {filtered.map((o) => {
            const sel = value.includes(o.value);
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  onClick={() => toggle(o.value)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded-sm border border-primary', sel && 'bg-primary text-primary-foreground')}>
                    {sel && <Check className="h-3 w-3" />}
                  </span>
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
        {value.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => onChange([])}>
            <X /> Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

/** Minimal accessible data table with sorting + pagination. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pageSize = 10,
  caption,
  empty = 'No rows',
  onRowClick,
  rowLabel,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  caption?: string;
  empty?: string;
  /** Makes rows clickable (mouse + Enter/Space). Interactive cells should stop propagation. */
  onRowClick?: (row: T) => void;
  /** Accessible label for clickable rows, e.g. `Open profile of ${name}`. */
  rowLabel?: (row: T) => string;
}) {
  const [sort, setSort] = React.useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = React.useState(1);
  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = sv(a);
      const bv = sv(b);
      return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
    });
  }, [rows, sort, columns]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const slice = sorted.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('whitespace-nowrap px-3 py-2.5 font-medium', c.className)}
                  aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                  {c.sortValue ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary"
                      onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}
                    >
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            )}
            {slice.map((r) => (
              <tr
                key={rowKey(r)}
                className={cn('border-b last:border-0 hover:bg-muted/30', onRowClick && 'cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring')}
                {...(onRowClick
                  ? {
                      tabIndex: 0,
                      'aria-label': rowLabel?.(r),
                      onClick: () => onRowClick(r),
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(r);
                        }
                      },
                    }
                  : {})}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 py-2.5 align-middle', c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <span>
          {sorted.length === 0 ? 0 : (current - 1) * pageSize + 1}–{Math.min(current * pageSize, sorted.length)} of {sorted.length}
        </span>
        <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}
