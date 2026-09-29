'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, BookOpen, Camera, Compass, Database, FileText, Lightbulb, Megaphone, Mountain, Ship, Users } from 'lucide-react';
import { PolarImage } from '@/components/common/polar-image';
import { RegionBadge, SectionHeader } from '@/components/common';
import { SearchBox } from '@/components/search/search-box';
import { ItemCard } from '@/components/archive/item-card';
import { MiniMap } from '@/components/maps/mini-map';
import { ToolPreview } from './tool-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardSkeleton, Skeleton, StatSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-queries';
import { useCountUp } from '@/hooks/use-count-up';
import { api } from '@/lib/mock-api';
import { TOOLS } from '@/lib/nav';
import { useT } from '@/lib/i18n';
import { STATIONS } from '@/data/stations';
import { GLOSSARY } from '@/data/glossary';
import { TOPICS } from '@/data/topics';
import { REGION_META } from '@/lib/constants';
import { useUiStore } from '@/store/ui';
import { cn } from '@/lib/utils';

const POPULAR = ['Sea ice', 'Ice cores', 'Penguins', 'Himalayan glaciers', 'Krill', 'Aurora', 'Ozone hole', 'Ocean warming', 'Permafrost', 'Careers'];

function StatCounter({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const v = useCountUp(value);
  return (
    <div className="rounded-lg border bg-card p-5 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden>
        {icon}
      </div>
      <p className="text-3xl font-semibold tabular-nums" aria-label={`${value} ${label}`}>
        {v}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function HomeView() {
  const t = useT();
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);
  const { data, isPending } = useApi(['home'], api.getHome);
  const [email, setEmail] = useState('');
  const day = new Date().getDate();
  const fact = TOPICS[day % TOPICS.length].findings[0];
  const term = GLOSSARY[day % GLOSSARY.length];

  const fade = reduce || low ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5 } };

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-polar-navy text-white">
        {!low && <PolarImage variant="aurora" seed="home-hero" alt="" decorative className="absolute inset-0 -z-10 h-full w-full" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-polar-navy/30 via-polar-navy/50 to-polar-navy" aria-hidden />
        <div className="container flex min-h-[560px] flex-col justify-center py-16 md:py-24">
          <motion.div {...(reduce || low ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } })} className="max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-polar-teal" aria-hidden /> Antarctica · Arctic · Himalaya · Southern Ocean
            </p>
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">{t('home.heroTitle')}</h1>
            <p className="mt-4 max-w-2xl text-lg text-white/80">{t('home.heroSubtitle')}</p>
          </motion.div>
          <div className="mt-8 max-w-2xl text-foreground">
            <SearchBox />
          </div>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Popular topics">
            {POPULAR.map((p) => (
              <Link key={p} href={`/explore?q=${encodeURIComponent(p)}`} className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm backdrop-blur transition-colors hover:bg-white/20">
                {p}
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="aurora" asChild>
              <Link href="/explore">
                <Compass /> {t('home.ctaExplore')}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" asChild>
              <Link href="/learn">
                <BookOpen /> {t('home.ctaLearn')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* BANNER */}
      {data?.banner && (
        <div className="border-b bg-polar-amber/15">
          <p className="container flex items-center gap-2 py-2.5 text-sm">
            <Megaphone className="h-4 w-4 shrink-0 text-polar-amber" aria-hidden /> {data.banner}
            <Link href="/events" className="ml-auto shrink-0 font-medium text-primary hover:underline">
              Events →
            </Link>
          </p>
        </div>
      )}

      {/* STATS */}
      <section aria-label="Archive at a glance" className="container -mt-0 py-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {isPending || !data ? (
            Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCounter label="Expeditions" value={data.stats.expeditions} icon={<Ship className="h-5 w-5" />} />
              <StatCounter label="Reports" value={data.stats.reports} icon={<FileText className="h-5 w-5" />} />
              <StatCounter label="Datasets" value={data.stats.datasets} icon={<Database className="h-5 w-5" />} />
              <StatCounter label="Photos" value={data.stats.photos} icon={<Camera className="h-5 w-5" />} />
              <StatCounter label="Publications" value={data.stats.publications} icon={<BookOpen className="h-5 w-5" />} />
            </>
          )}
        </div>
      </section>

      {/* FEATURED EXPEDITION + STREAM TEASER */}
      <section className="container grid gap-6 pb-16 lg:grid-cols-[1.4fr_1fr]">
        {isPending || !data ? (
          <Skeleton className="h-[360px] w-full" />
        ) : (
          <motion.article {...fade} className="relative overflow-hidden rounded-lg border bg-card">
            <div className="grid md:grid-cols-2">
              <PolarImage variant={data.featuredExpedition.art} seed={data.featuredExpedition.id} alt={`Photo illustrating ${data.featuredExpedition.name}`} className="aspect-[4/3] md:aspect-auto md:h-full" />
              <div className="flex flex-col p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Featured expedition</p>
                <h2 className="mt-2 text-2xl font-semibold">{data.featuredExpedition.name}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <RegionBadge region={data.featuredExpedition.region} />
                  <span className="text-sm text-muted-foreground">
                    {data.featuredExpedition.startDate} → {data.featuredExpedition.endDate}
                  </span>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {data.featuredExpedition.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-polar-amber" aria-hidden /> {h}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" aria-hidden /> {data.featuredExpedition.teamSize} members · led by {data.featuredExpedition.leader}
                </p>
                <Button className="mt-auto w-fit" asChild>
                  <Link href={`/expeditions/${data.featuredExpedition.id}`}>
                    Open expedition hub <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.article>
        )}
        <motion.div {...fade} className="flex flex-col rounded-lg border bg-gradient-to-br from-polar-navy to-[#123a63] p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-polar-teal">Year-wise stream</p>
          <h2 className="mt-2 text-2xl font-semibold">18 years of expeditions, one river of discovery</h2>
          <svg viewBox="0 0 300 120" className="my-4 w-full" aria-hidden>
            <path d="M5 60 C 50 10, 90 110, 150 60 S 250 10, 295 60" stroke="#2DD4BF" strokeWidth="6" fill="none" strokeLinecap="round" opacity=".8" />
            {[2008, 2011, 2014, 2017, 2020, 2023, 2025].map((y, i) => {
              const x = 10 + i * 46;
              const yy = 60 + Math.sin(i * 1.4) * 30;
              return (
                <g key={y}>
                  <circle cx={x} cy={yy} r="6" fill={Object.values(REGION_META)[i % 5].color} stroke="#fff" strokeWidth="2" />
                  <text x={x} y={yy + 20} fontSize="10" fill="#fff" textAnchor="middle" opacity=".85">
                    {y}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="text-sm text-white/75">Follow every Antarctic, Arctic, Himalayan and ocean expedition from 2008 to 2025 along a flowing timeline.</p>
          <Button variant="aurora" className="mt-auto w-fit" asChild>
            <Link href="/expeditions">
              Explore the stream <ArrowRight />
            </Link>
          </Button>
        </motion.div>
      </section>

      {/* LATEST BLOGS */}
      <section className="bg-card/60 py-16">
        <div className="container">
          <SectionHeader
            eyebrow="Stories"
            title="Latest from the blog"
            description="Plain-language stories from the field, many with Expert / General / Class 8 versions."
            action={
              <Button variant="outline" asChild>
                <Link href="/blog">{t('common.viewAll')}</Link>
              </Button>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isPending || !data
              ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              : [...data.blogs, ...data.latestBlogs.filter((b) => !data.blogs.some((x) => x.id === b.id))].slice(0, 6).map((b) => <ItemCard key={b.id} item={b} />)}
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section className="container py-16">
        <SectionHeader
          eyebrow="Scientific tools"
          title="Explore the science hands-on"
          description="Interactive maps, a 3D ice core, soundscapes, satellite layers, a tipping-point sandbox and a space-weather observatory."
          action={
            <Button variant="outline" asChild>
              <Link href="/tools">All tools</Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool, i) => (
            <Link
              key={tool.slug}
              href={tool.href}
              className={cn('group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md', i === 0 && 'lg:col-span-2')}
            >
              <div className="h-28 overflow-hidden">{!low && <ToolPreview icon={tool.icon} />}</div>
              <div className="p-4">
                <p className="font-semibold group-hover:text-primary">{tool.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* MAP + PHOTO + FACT */}
      <section className="container grid gap-6 pb-16 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Mountain className="h-5 w-5 text-primary" aria-hidden /> India’s polar stations
          </h2>
          <MiniMap
            className="mx-auto mt-3 max-w-[280px]"
            center={[45, -20]}
            label="Globe showing India’s four polar stations: Maitri, Bharati, Himadri and Himansh"
            points={STATIONS.map((s) => ({ lon: s.lon, lat: s.lat, label: s.name, color: REGION_META[s.region].color }))}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {STATIONS.map((s) => (
              <Link key={s.slug} href={`/stations/${s.slug}`} className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted">
                {s.name}
              </Link>
            ))}
          </div>
          <Button variant="link" className="px-0" asChild>
            <Link href="/tools/polar-map/2d">Open the polar map →</Link>
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          {isPending || !data ? (
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
          ) : (
            <Link href={`/gallery?item=${data.photoOfDay.id}`} className="block">
              <PolarImage variant={data.photoOfDay.art} seed={data.photoOfDay.id} alt={data.photoOfDay.altText} className="aspect-[4/3]" />
            </Link>
          )}
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Photo of the day</p>
            <p className="mt-1 font-medium">{data?.photoOfDay.caption ?? '…'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data?.photoOfDay.credit}</p>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border bg-gradient-to-br from-polar-teal/15 to-polar-violet/15 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Fact of the day</p>
            <p className="mt-2 text-lg font-medium">{fact}</p>
            <p className="mt-2 text-xs text-muted-foreground">Demo finding from the archive.</p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Word of the day</p>
            <p className="mt-2 font-semibold">{term.term}</p>
            <p className="text-sm text-muted-foreground">{term.simple}</p>
            <Link href={`/learn/glossary#${term.id}`} className="mt-2 inline-block text-sm text-primary hover:underline">
              Glossary →
            </Link>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="border-t bg-polar-navy py-14 text-white">
        <div className="container flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Get polar stories in your inbox</h2>
            <p className="mt-1 text-white/75">A monthly (demo) newsletter for students, teachers and science fans.</p>
          </div>
          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error('Please enter a valid email');
              toast.success('Subscribed (demo)', { description: 'No email will actually be sent.' });
              setEmail('');
            }}
          >
            <label htmlFor="nl-email" className="sr-only">
              Email address
            </label>
            <Input id="nl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="bg-white text-polar-navy" />
            <Button type="submit" variant="aurora">
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}
