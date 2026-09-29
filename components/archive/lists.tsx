'use client';

import Link from 'next/link';
import { Compass, Download, Fingerprint, KeyRound, Table2 } from 'lucide-react';
import type { Blog, Dataset, Publication, Report } from '@/types';
import { ArchiveListView } from './list-view';
import { HeroChip } from '@/components/common/page-hero';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/mock-api';

const exploreBtn = (q: string) => (
  <Button variant="outline" asChild>
    <Link href={`/explore?tab=${q}`}>
      <Compass /> Semantic search
    </Link>
  </Button>
);

export function ReportsList() {
  return (
    <ArchiveListView<Report>
      queryKey="reports"
      fetcher={api.getReports}
      type="report"
      eyebrow="Archive"
      title="Reports"
      description="Expedition, survey, technical and annual reports with summaries, key findings and attachments."
      headerAction={exploreBtn('report')}
      extraFilter={{
        label: 'Report types',
        options: ['Expedition report', 'Technical report', 'Survey report', 'Annual report'].map((v) => ({ value: v, label: v })),
        test: (r, v) => r.reportType === v,
      }}
    />
  );
}

export function DatasetsList() {
  return (
    <ArchiveListView<Dataset>
      queryKey="datasets"
      fetcher={api.getDatasets}
      type="dataset"
      eyebrow="Data catalogue"
      title="Datasets"
      description="Sea ice, glaciers, weather, ocean and geospace measurements from India’s polar programme — every record with a DOI, a data dictionary and a clear licence. All values are demo data."
      headerAction={
        <Button asChild className="bg-white text-polar-navy shadow-lg hover:bg-white/90">
          <Link href="/explore?tab=dataset">
            <Compass /> Semantic search
          </Link>
        </Button>
      }
      hero={{
        title: 'The data',
        script: 'catalogue',
        image: 'ice-core-store',
        meta: (
          <ul className="flex flex-wrap gap-2">
            {[
              { icon: Fingerprint, label: 'DOI on every dataset' },
              { icon: Table2, label: 'Data dictionaries' },
              { icon: Download, label: 'CSV preview & download' },
              { icon: KeyRound, label: 'Access levels & embargoes' },
            ].map((x) => (
              <li key={x.label}>
                <HeroChip>
                  <x.icon className="h-3.5 w-3.5" aria-hidden /> {x.label}
                </HeroChip>
              </li>
            ))}
          </ul>
        ),
      }}
    />
  );
}

export function PublicationsList() {
  return (
    <ArchiveListView<Publication>
      queryKey="publications"
      fetcher={api.getPublications}
      type="publication"
      eyebrow="Research output"
      title="Publications"
      description="Peer-reviewed papers (demo) with DOIs, abstracts and linked datasets."
      headerAction={exploreBtn('publication')}
    />
  );
}

export function BlogsList() {
  return (
    <ArchiveListView<Blog>
      queryKey="blogs"
      fetcher={api.getBlogs}
      type="blog"
      eyebrow="Stories"
      title="Blog & articles"
      description="Stories from the field in plain language. Many have Expert, General and Class 8 versions and Hindi/Marathi translations."
      headerAction={exploreBtn('blog')}
      extraFilter={{
        label: 'Languages',
        options: [
          { value: 'hi', label: 'Has Hindi' },
          { value: 'mr', label: 'Has Marathi' },
          { value: 'class8', label: 'Has Class 8 version' },
        ],
        test: (b, v) => (v === 'class8' ? !!b.versions.class8 : !!b.translations?.[v as 'hi' | 'mr']),
      }}
    />
  );
}
