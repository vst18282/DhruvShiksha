import type { Metadata } from 'next';
import Link from 'next/link';
import { TOOLS } from '@/lib/nav';
import { ToolPreview } from '@/components/home/tool-preview';
import { ToolIcon } from '@/components/layout/tool-icon';
import { SectionHeader, DemoBadge } from '@/components/common';

export const metadata: Metadata = { title: 'Scientific Tools', description: 'Ice core explorer, soundscapes, satellite layers, climate sandbox and space weather observatory.' };

export default function ToolsHub() {
  return (
    <div className="container py-8">
      <SectionHeader as="h1" eyebrow="Scientific Tools" title="Hands-on polar science" description="Five interactive tools built on demo data. Each has a “how to use” guide and a plain-language science explainer. Maps moved to the Map item in the header." action={<DemoBadge />} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.slug} href={t.href} className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring">
            <div className="h-40 overflow-hidden transition-transform duration-500 group-hover:scale-[1.03]">
              <ToolPreview icon={t.icon} />
            </div>
            <div className="flex gap-3 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <ToolIcon name={t.icon} className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold group-hover:text-primary">{t.title}</h2>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
