'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Lightbulb, Minus, Plus } from 'lucide-react';
import type { Report } from '@/types';
import { ItemLoader, DetailHeader, MetaPanel } from '@/components/archive/detail';
import { AccessPanel, BookmarkButton, CiteDialog, GeneratePostButton, ShareButtons } from '@/components/archive/actions';
import { RelatedContent } from '@/components/archive/related-content';
import { GenerateSummaryButton } from '@/components/studio/summary-dialog';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { accessState } from '@/lib/access';

/** Paged "PDF-style" viewer placeholder. Each report section is rendered as a page. */
function PdfViewer({ report, locked }: { report: Report; locked: boolean }) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const pages = report.sections;
  const p = pages[page];
  return (
    <div className="overflow-hidden rounded-lg border bg-muted/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <FileText className="h-4 w-4 text-primary" aria-hidden /> {report.slug}.pdf <span className="text-xs text-muted-foreground">(preview · demo)</span>
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(70, z - 10))} aria-label="Zoom out">
            <Minus />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums">{zoom}%</span>
          <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(150, z + 10))} aria-label="Zoom in">
            <Plus />
          </Button>
          <span className="mx-2 h-5 w-px bg-border" aria-hidden />
          <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <span className="text-xs tabular-nums" aria-live="polite">
            Page {page + 1} / {locked ? 1 : pages.length}
          </span>
          <Button variant="ghost" size="icon" disabled={locked || page >= pages.length - 1} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="flex justify-center overflow-auto p-4 sm:p-8">
        <article
          className="relative w-full max-w-[640px] origin-top rounded-sm bg-white p-8 text-slate-900 shadow-md sm:p-12"
          style={{ transform: `scale(${zoom / 100})`, marginBottom: `${(zoom - 100) * 6}px` }}
          aria-label={`Report page ${page + 1}`}
        >
          <p className="text-[10px] uppercase tracking-widest text-slate-500">NCPOR · {report.reportType} · {report.year} · DEMO</p>
          <h2 className="mt-3 text-xl font-semibold">{p.heading}</h2>
          <p className={locked && page === 0 ? 'mt-4 text-sm leading-7' : 'mt-4 text-sm leading-7'}>{p.body}</p>
          {page === 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
              {report.keyFindings.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          {locked && (
            <div className="absolute inset-x-0 bottom-0 flex h-40 items-end justify-center bg-gradient-to-t from-white via-white/95 to-transparent pb-6 text-sm font-medium text-slate-700">
              Full report available after access is granted.
            </div>
          )}
          <p className="mt-10 text-right text-[10px] text-slate-400">— {page + 1} —</p>
        </article>
      </div>
    </div>
  );
}

export function ReportDetail({ id }: { id: string }) {
  const user = useAuthStore((s) => s.user);
  const requests = useDataStore((s) => s.accessRequests);
  return (
    <ItemLoader<Report> id={id}>
      {(r) => {
        const locked = !accessState(r, user, requests).canDownload;
        return (
          <div className="container py-8">
            <DetailHeader
              item={r}
              section="Reports"
              sectionHref="/reports"
              subtitle={r.summary}
              actions={
                <>
                  <BookmarkButton item={r} />
                  <CiteDialog item={r} />
                  <ShareButtons title={r.title} />
                  <GenerateSummaryButton item={r} />
                  <GeneratePostButton item={r} />
                </>
              }
            />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
              <div className="space-y-6">
                <section aria-labelledby="kf" className="rounded-lg border bg-gradient-to-br from-polar-teal/10 to-polar-glacier/10 p-5">
                  <h2 id="kf" className="flex items-center gap-2 font-semibold">
                    <Lightbulb className="h-5 w-5 text-polar-amber" aria-hidden /> Summary & key findings
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {r.keyFindings.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">All values are illustrative demo data, not real scientific findings.</p>
                </section>
                <PdfViewer report={r} locked={locked} />
              </div>
              <aside className="space-y-4">
                <div className="rounded-lg border bg-card p-5">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Access & files</h2>
                  <AccessPanel item={r} files={r.attachments} />
                </div>
                <MetaPanel item={r} extra={[{ label: 'Type', value: r.reportType }, { label: 'Pages', value: r.pages }]} />
              </aside>
            </div>
            <RelatedContent item={r} />
          </div>
        );
      }}
    </ItemLoader>
  );
}
