import type { Metadata } from 'next';
import Link from 'next/link';
import { Accessibility, Camera, FileLock2, Mail, Map, Scale, Target } from 'lucide-react';
import { SectionHeader, DemoBadge } from '@/components/common';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/misc';
import { PolarImage } from '@/components/common/polar-image';
import { FAQS } from '@/data/learn';
import { MAIN_NAV, TOOLS, FOOTER_LINKS } from '@/lib/nav';
import { IMAGE_LIBRARY } from '@/lib/images';

export const metadata: Metadata = { title: 'About', description: 'About the PolarVerse demo, data policy, licences and accessibility.' };

const LICENCES = [
  { id: 'CC-BY-4.0', text: 'Reuse with attribution, including commercially.' },
  { id: 'CC-BY-NC-4.0', text: 'Reuse with attribution for non-commercial purposes.' },
  { id: 'CC0', text: 'No rights reserved (public domain dedication).' },
  { id: 'NCPOR-Restricted', text: 'Access by request; terms set by the data owner.' },
];

export default function AboutPage() {
  return (
    <div className="container py-8">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <DemoBadge className="mb-3" />
          <SectionHeader as="h1" eyebrow="About" title="About NCPOR & PolarVerse" description="PolarVerse is a concept portal that brings together a polar knowledge repository and an outreach engine for the National Centre for Polar and Ocean Research (NCPOR), Goa, under the Ministry of Earth Sciences." className="mb-0" />
        </div>
        <PolarImage variant="station" seed="about" alt="A polar research station under a clear sky" className="aspect-[16/9] rounded-lg" />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border bg-card p-6" aria-labelledby="mission">
          <h2 id="mission" className="flex items-center gap-2 text-xl font-semibold"><Target className="h-5 w-5 text-primary" aria-hidden /> Mission</h2>
          <p className="mt-3 text-muted-foreground">NCPOR coordinates India’s scientific work in Antarctica, the Arctic, the Himalaya and the Southern and Indian Oceans. PolarVerse imagines how its reports, datasets, photos and activities could be archived, found and shared — with trustworthy, human-approved outreach for students and the public.</p>
          <p className="mt-3 text-sm text-muted-foreground">Note: this is a demonstration. All people, numbers and findings are fictional.</p>
        </section>
        <section id="data-policy" className="scroll-mt-28 rounded-lg border bg-card p-6" aria-labelledby="dp">
          <h2 id="dp" className="flex items-center gap-2 text-xl font-semibold"><FileLock2 className="h-5 w-5 text-primary" aria-hidden /> Data policy</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li><strong>Open</strong> items are free to view and download.</li>
            <li><strong>Registered</strong> items require a free account.</li>
            <li><strong>Restricted</strong> items are shared on request after owner review.</li>
            <li><strong>Embargoed</strong> items open automatically after the embargo date.</li>
            <li>Every item carries a licence, credit line and (for datasets) a DOI.</li>
            <li>AI-generated drafts are labelled and always reviewed by a human before publishing.</li>
          </ul>
        </section>
        <section className="rounded-lg border bg-card p-6" aria-labelledby="lic">
          <h2 id="lic" className="flex items-center gap-2 text-xl font-semibold"><Scale className="h-5 w-5 text-primary" aria-hidden /> Licences</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {LICENCES.map((l) => (
              <div key={l.id} className="grid grid-cols-[140px_1fr] gap-2">
                <dt className="font-mono text-xs">{l.id}</dt>
                <dd className="text-muted-foreground">{l.text}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section id="accessibility" className="scroll-mt-28 rounded-lg border bg-card p-6" aria-labelledby="a11y">
          <h2 id="a11y" className="flex items-center gap-2 text-xl font-semibold"><Accessibility className="h-5 w-5 text-primary" aria-hidden /> Accessibility statement</h2>
          <p className="mt-3 text-sm text-muted-foreground">PolarVerse is designed with GIGW and WCAG 2.1 AA guidance in mind: skip links, landmarks, keyboard navigation, visible focus, text resizing (A-/A/A+), a high-contrast mode, reduced-motion support, captions and transcripts, and a low-bandwidth mode. Full conformance requires manual testing with assistive technologies and expert review, which this demo has not undergone.</p>
        </section>
      </div>

      <section className="mt-12" aria-labelledby="faq">
        <h2 id="faq" className="mb-4 text-2xl font-semibold">Help & FAQ</h2>
        <Accordion type="single" collapsible className="rounded-lg border bg-card px-5">
          {FAQS.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border bg-card p-6" aria-labelledby="contact">
          <h2 id="contact" className="flex items-center gap-2 text-xl font-semibold"><Mail className="h-5 w-5 text-primary" aria-hidden /> Contact (demo)</h2>
          <address className="mt-3 text-sm not-italic text-muted-foreground">
            National Centre for Polar and Ocean Research (demo address)<br />
            Headland Sada, Vasco da Gama, Goa, India<br />
            outreach@ncpor.demo · +91-00000-00000 (placeholder)
          </address>
        </section>
        <section className="rounded-lg border bg-card p-6" aria-labelledby="smap">
          <h2 id="smap" className="flex items-center gap-2 text-xl font-semibold"><Map className="h-5 w-5 text-primary" aria-hidden /> Sitemap</h2>
          <ul className="mt-3 grid grid-cols-2 gap-1 text-sm">
            {[...MAIN_NAV.map((n) => ({ label: n.href === '/' ? 'Home' : n.href.slice(1), href: n.href })), ...TOOLS.map((t) => ({ label: t.title, href: t.href })), ...FOOTER_LINKS.flatMap((c) => c.links)].map((l) => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="capitalize text-primary hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section id="image-credits" className="mt-12 scroll-mt-28 rounded-lg border bg-card p-6" aria-labelledby="credits">
        <h2 id="credits" className="flex items-center gap-2 text-xl font-semibold">
          <Camera className="h-5 w-5 text-primary" aria-hidden /> Image credits
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Photos and maps are real, freely licensed images from Wikimedia Commons, chosen to match each card&apos;s topic. The archive items are fictional, so the images illustrate the subject rather than show the item itself. Images were resized, and the hero photo cropped; nothing else was changed.
        </p>
        <ul className="mt-4 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(IMAGE_LIBRARY).map(([id, img]) => (
            <li key={id} className="min-w-0">
              <a href={img.source} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                {img.alt}
              </a>{' '}
              <span className="text-muted-foreground">
                · {img.author} · {img.license}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
