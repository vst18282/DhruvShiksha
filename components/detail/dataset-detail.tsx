'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Lock } from 'lucide-react';
import type { Dataset } from '@/types';
import { ItemLoader, DetailHeader, MetaPanel } from '@/components/archive/detail';
import { AccessPanel, BookmarkButton, CiteDialog, GeneratePostButton, ShareButtons } from '@/components/archive/actions';
import { RelatedContent } from '@/components/archive/related-content';
import { MiniMap } from '@/components/maps/mini-map';
import { ChartSkeleton } from '@/components/skeletons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toApa, toBibtex, toRis } from '@/lib/cite';
import { accessState } from '@/lib/access';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { downloadTextFile, toCsv } from '@/lib/utils';

const DatasetChart = dynamic(() => import('@/components/charts/dataset-chart'), { ssr: false, loading: () => <ChartSkeleton height={280} /> });

function CitationBox({ d }: { d: Dataset }) {
  const [fmt, setFmt] = useState<'apa' | 'bibtex' | 'ris'>('apa');
  const text = fmt === 'apa' ? toApa(d) : fmt === 'bibtex' ? toBibtex(d) : toRis(d);
  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Citation generator</h2>
      <div className="mb-2 flex gap-1" role="group" aria-label="Citation format">
        {(['apa', 'bibtex', 'ris'] as const).map((f) => (
          <Button key={f} size="sm" variant={fmt === f ? 'default' : 'outline'} onClick={() => setFmt(f)} aria-pressed={fmt === f}>
            {f === 'apa' ? 'APA' : f === 'bibtex' ? 'BibTeX' : 'RIS'}
          </Button>
        ))}
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-[11px]">{text}</pre>
      <Button
        size="sm"
        variant="outline"
        className="mt-2 w-full"
        onClick={async () => {
          await navigator.clipboard?.writeText(text);
          toast.success('Citation copied');
        }}
      >
        <Copy /> Copy
      </Button>
    </div>
  );
}

export function DatasetDetail({ id }: { id: string }) {
  const user = useAuthStore((s) => s.user);
  const requests = useDataStore((s) => s.accessRequests);
  return (
    <ItemLoader<Dataset> id={id}>
      {(d) => {
        const open = accessState(d, user, requests).canDownload;
        return (
          <div className="container py-8">
            <DetailHeader
              item={d}
              section="Data catalogue"
              sectionHref="/data"
              subtitle={
                <>
                  {d.summary}{' '}
                  <span className="mt-2 block font-mono text-sm">
                    DOI: <span className="text-foreground">{d.doi}</span> <span className="text-xs">(demo, not resolvable)</span>
                  </span>
                </>
              }
              actions={
                <>
                  <BookmarkButton item={d} />
                  <CiteDialog item={d} />
                  <ShareButtons title={d.title} />
                  <GeneratePostButton item={d} />
                </>
              }
            />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
              <div className="space-y-6">
                <Tabs defaultValue="preview">
                  <TabsList>
                    <TabsTrigger value="preview">Quick preview</TabsTrigger>
                    <TabsTrigger value="dictionary">Data dictionary</TabsTrigger>
                    <TabsTrigger value="rows">Sample rows</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="rounded-lg border bg-card p-4">
                    {open ? (
                      <DatasetChart dataset={d} />
                    ) : (
                      <div className="relative">
                        <div className="pointer-events-none select-none blur-sm" aria-hidden>
                          <DatasetChart dataset={d} height={220} />
                        </div>
                        <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium">
                          <Lock className="h-4 w-4" aria-hidden /> Preview locked — see access options
                        </p>
                      </div>
                    )}
                    <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                      {d.keyFindings.map((k) => (
                        <li key={k}>• {k}</li>
                      ))}
                    </ul>
                  </TabsContent>
                  <TabsContent value="dictionary">
                    <div className="overflow-x-auto rounded-lg border bg-card">
                      <table className="w-full text-sm">
                        <caption className="sr-only">Data dictionary</caption>
                        <thead className="border-b bg-muted/50 text-left">
                          <tr>
                            <th scope="col" className="px-3 py-2">Variable</th>
                            <th scope="col" className="px-3 py-2">Unit</th>
                            <th scope="col" className="px-3 py-2">Type</th>
                            <th scope="col" className="px-3 py-2">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.variables.map((v) => (
                            <tr key={v.name} className="border-b last:border-0">
                              <td className="px-3 py-2 font-mono text-xs">{v.name}</td>
                              <td className="px-3 py-2">{v.unit || '—'}</td>
                              <td className="px-3 py-2">{v.dataType}</td>
                              <td className="px-3 py-2 text-muted-foreground">{v.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => downloadTextFile(`${d.slug}-data-dictionary.csv`, toCsv(d.variables.map((v) => ({ ...v }))), 'text/csv')}
                    >
                      Download data dictionary (CSV)
                    </Button>
                  </TabsContent>
                  <TabsContent value="rows">
                    {open ? (
                      <div className="max-h-96 overflow-auto rounded-lg border bg-card">
                        <table className="w-full text-xs">
                          <caption className="sr-only">First sample rows</caption>
                          <thead className="sticky top-0 border-b bg-muted text-left">
                            <tr>
                              {d.variables.map((v) => (
                                <th key={v.name} scope="col" className="px-3 py-2 font-mono">
                                  {v.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {d.sampleRows.slice(0, 25).map((row, i) => (
                              <tr key={i} className="border-b last:border-0">
                                {d.variables.map((v) => (
                                  <td key={v.name} className="px-3 py-1.5 tabular-nums">
                                    {String(row[v.name])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Sample rows are hidden until you have access.</p>
                    )}
                  </TabsContent>
                </Tabs>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border bg-card p-4">
                    <h2 className="mb-2 text-sm font-semibold">Spatial extent</h2>
                    <MiniMap className="mx-auto max-w-[240px]" bbox={d.spatialExtent} label={`Map showing dataset extent from ${d.spatialExtent.minLat}° to ${d.spatialExtent.maxLat}° latitude`} />
                    <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">
                      {d.spatialExtent.minLon}°, {d.spatialExtent.minLat}° → {d.spatialExtent.maxLon}°, {d.spatialExtent.maxLat}°
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-4 text-sm">
                    <h2 className="mb-2 font-semibold">Coverage & format</h2>
                    <dl className="space-y-2">
                      <div><dt className="text-muted-foreground">Temporal coverage</dt><dd>{d.temporalCoverage}</dd></div>
                      <div><dt className="text-muted-foreground">Format</dt><dd>{d.format}</dd></div>
                      <div><dt className="text-muted-foreground">Size</dt><dd>{d.sizeMb} MB (full dataset, demo)</dd></div>
                      <div><dt className="text-muted-foreground">Licence</dt><dd>{d.licence}</dd></div>
                      {d.expeditionId && (
                        <div><dt className="text-muted-foreground">Collected during</dt><dd><Link className="text-primary hover:underline" href={`/expeditions/${d.expeditionId}`}>{d.expeditionId.toUpperCase()}</Link></dd></div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
              <aside className="space-y-4">
                <div className="rounded-lg border bg-card p-5">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Access & download</h2>
                  <AccessPanel item={d} />
                </div>
                <CitationBox d={d} />
                <MetaPanel item={d} extra={[{ label: 'DOI', value: <span className="font-mono text-xs">{d.doi}</span> }]} />
              </aside>
            </div>
            <RelatedContent item={d} />
          </div>
        );
      }}
    </ItemLoader>
  );
}
