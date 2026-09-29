'use client';

import { toast } from 'sonner';
import { Download, FileText, Image as ImageIcon, NotebookPen, Palette } from 'lucide-react';
import { Breadcrumbs, SectionHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RESOURCES, CAREERS } from '@/data/learn';
import { useUserStore } from '@/store/user';
import { useAuthStore } from '@/store/auth';
import { downloadTextFile } from '@/lib/utils';

const ICON = { Worksheet: FileText, Poster: ImageIcon, 'Lesson plan': NotebookPen, Activity: Palette } as const;

export function ResourcesView() {
  const record = useUserStore((s) => s.recordDownload);
  const user = useAuthStore((s) => s.user);
  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: 'Learn', href: '/learn' }, { label: 'Resources' }]} />
      <SectionHeader as="h1" eyebrow="For teachers & students" title="Learning resources" description="Worksheets, posters, lesson plans and activities (demo files, CC-BY-4.0)." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCES.map((r) => {
          const I = ICON[r.kind as keyof typeof ICON] ?? FileText;
          return (
            <li key={r.id} className="flex flex-col rounded-lg border bg-card p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary"><I className="h-5 w-5" aria-hidden /></span>
              <h2 className="font-semibold">{r.title}</h2>
              <div className="mt-2 flex gap-2"><Badge variant="secondary">{r.kind}</Badge><Badge variant="outline">{r.level}</Badge></div>
              <p className="mt-2 text-xs text-muted-foreground">{Math.round(r.sizeKb / 1024 * 10) / 10 || '<1'} MB · PDF (demo)</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto w-fit pt-0"
                onClick={() => {
                  downloadTextFile(`${r.id}.demo.txt`, `${r.title}\n${r.kind} · ${r.level}\n\nDemo placeholder for a printable PDF resource.\nLicence: CC-BY-4.0 (demo).`);
                  if (user) record({ type: 'report', id: r.id }, r.title);
                  toast.success('Download started (demo)');
                }}
              >
                <Download /> Download
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CareersView() {
  return (
    <div className="container py-8">
      <Breadcrumbs items={[{ label: 'Learn', href: '/learn' }, { label: 'Careers' }]} />
      <SectionHeader as="h1" eyebrow="Careers" title="Become a polar scientist" description="Many paths lead to the poles — science, engineering, medicine and communication. (Illustrative guidance.)" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CAREERS.map((c) => (
          <article key={c.role} className="rounded-lg border bg-card p-5">
            <h2 className="text-lg font-semibold">{c.role}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.path}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">{c.skills.map((s) => <li key={s}><Badge variant="secondary">{s}</Badge></li>)}</ul>
          </article>
        ))}
      </div>
      <section className="mt-10 rounded-lg border bg-gradient-to-br from-polar-teal/10 to-polar-violet/10 p-6">
        <h2 className="text-xl font-semibold">Tips from the field (demo)</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>Build strong basics in maths and physics — they help in every polar discipline.</li>
          <li>Learn to code (Python or R) to analyse data.</li>
          <li>Join science clubs, camps and outreach programmes.</li>
          <li>Stay fit and learn teamwork — expeditions are team sports!</li>
        </ul>
      </section>
    </div>
  );
}
