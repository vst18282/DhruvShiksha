import type { Metadata } from 'next';
import { Camera, FileText, Mail, Newspaper } from 'lucide-react';
import { SectionHeader, DemoBadge } from '@/components/common';
import { PRESS_RELEASES } from '@/data/org';
import { STATIONS } from '@/data/stations';
import { MEDIA } from '@/data/archive';
import { PolarImage } from '@/components/common/polar-image';
import { PressDownload } from './press-download';

export const metadata: Metadata = { title: 'Press & media kit', description: 'Press releases, fact sheets, photo packs and media contacts (demo).' };

export default function PressPage() {
  const photos = MEDIA.filter((m) => m.type === 'photo').slice(0, 6);
  return (
    <div className="container py-8">
      <DemoBadge className="mb-3" />
      <SectionHeader as="h1" eyebrow="Media" title="Press & media kit" description="Everything journalists need: releases, fact sheets, high-resolution photo packs and contacts. All materials are demo placeholders." />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="pr">
          <h2 id="pr" className="mb-4 flex items-center gap-2 text-xl font-semibold"><Newspaper className="h-5 w-5 text-primary" aria-hidden /> Press releases</h2>
          <ol className="space-y-4">
            {PRESS_RELEASES.map((p) => (
              <li key={p.id} className="rounded-lg border bg-card p-5">
                <p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                <h3 className="mt-1 font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.summary}</p>
                <PressDownload name={`${p.id}-press-release.txt`} body={`${p.title}\n${p.date}\n\n${p.body}\n\n(Demo press release)`} label="Download release" />
              </li>
            ))}
          </ol>
        </section>
        <aside className="space-y-6">
          <section className="rounded-lg border bg-card p-5" aria-labelledby="fs">
            <h2 id="fs" className="mb-3 flex items-center gap-2 font-semibold"><FileText className="h-5 w-5 text-primary" aria-hidden /> Fact sheets</h2>
            <ul className="space-y-2 text-sm">
              {STATIONS.map((s) => (
                <li key={s.slug} className="flex items-center justify-between gap-2">
                  <span>{s.name} station fact sheet</span>
                  <PressDownload name={`${s.slug}-factsheet.txt`} body={`${s.name}\n${s.location}\n\n${s.description}\n\n${s.facts.map((f) => `${f.label}: ${f.value}`).join('\n')}\n\n(Demo)`} label="Get" small />
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border bg-card p-5" aria-labelledby="ph">
            <h2 id="ph" className="mb-3 flex items-center gap-2 font-semibold"><Camera className="h-5 w-5 text-primary" aria-hidden /> High-res photo pack</h2>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <PolarImage key={p.id} variant={p.art} seed={p.id} alt={p.altText} className="aspect-square rounded-md" />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">6 images · CC-BY-NC-4.0 · credit “NCPOR (demo)”</p>
            <PressDownload name="photo-pack-manifest.txt" body={photos.map((p) => `${p.slug}.jpg — ${p.caption} — ${p.credit}`).join('\n')} label="Download pack (manifest)" />
          </section>
          <section className="rounded-lg border bg-card p-5" aria-labelledby="mc">
            <h2 id="mc" className="mb-3 flex items-center gap-2 font-semibold"><Mail className="h-5 w-5 text-primary" aria-hidden /> Media contacts</h2>
            <p className="text-sm">Meera Kulkarni (demo)<br /><span className="text-muted-foreground">Outreach & Media Cell</span><br />media@ncpor.demo</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
