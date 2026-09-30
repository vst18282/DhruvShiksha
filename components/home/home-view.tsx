'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BookOpen, Compass, Megaphone } from 'lucide-react';
import { SearchBox } from '@/components/search/search-box';
import { LandingBar } from './landing-bar';
import { useLandingGate } from './landing-gate';
import { LandingTools } from './landing-tools';
import { ArchiveBand, ExpeditionSection, NewsletterSection, StationsSection, StoriesSection, TodaySection } from './landing-sections';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { IMAGE_LIBRARY } from '@/lib/images';
import { useT } from '@/lib/i18n';
import { GLOSSARY } from '@/data/glossary';
import { TOPICS } from '@/data/topics';
import { useUiStore } from '@/store/ui';

const POPULAR = ['Sea ice', 'Ice cores', 'Penguins', 'Himalayan glaciers', 'Krill', 'Aurora', 'Ozone hole', 'Ocean warming', 'Permafrost', 'Careers'];

export function HomeView() {
  const t = useT();
  const reduce = useReducedMotion();
  const low = useUiStore((s) => s.lowBandwidth);
  // Visitors following any link into the portal are sent to log in / sign up first.
  const go = useLandingGate();
  const { data, isPending } = useApi(['home'], api.getHome);
  const day = new Date().getDate();
  const fact = TOPICS[day % TOPICS.length].findings[0];
  const term = GLOSSARY[day % GLOSSARY.length];

  return (
    <>
      {/* HERO — the landing page. The photograph keeps its natural colour; a neutral shade sits only
          behind the text (left and bottom) so it stays readable without tinting the whole image. */}
      <section className="relative isolate flex min-h-screen flex-col overflow-hidden bg-neutral-900 text-white">
        {!low && (
          <img
            src={IMAGE_LIBRARY['hero-lemaire'].src}
            alt=""
            aria-hidden
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/65 via-black/35 to-black/5" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black/50 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-black/40 to-transparent" aria-hidden />

        <LandingBar />

        <div className="container flex flex-1 flex-col justify-center py-12 md:py-16">
          <motion.div {...(reduce || low ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } })} className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/75">Antarctica · Arctic · Himalaya · Southern Ocean</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-[3.5rem]">{t('home.heroTitle')}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/85">{t('home.heroSubtitle')}</p>
          </motion.div>
          <div className="mt-8 max-w-2xl text-foreground">
            <SearchBox onNavigate={go} />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75" aria-label="Popular topics">
            <span className="mr-2 text-white/60">Popular:</span>
            {POPULAR.slice(0, 6).map((p, i) => (
              <span key={p}>
                {i > 0 && <span className="mx-2 text-white/40" aria-hidden>·</span>}
                <Link href={`/explore?q=${encodeURIComponent(p)}`} className="underline-offset-4 hover:text-white hover:underline">
                  {p}
                </Link>
              </span>
            ))}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button size="lg" className="bg-white text-neutral-900 hover:bg-white/90" asChild>
              <Link href="/explore">
                <Compass /> {t('home.ctaExplore')}
              </Link>
            </Button>
            <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" asChild>
              <Link href="/learn">
                <BookOpen /> {t('home.ctaLearn')} <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>

        <p className="container pb-8 text-xs text-white/60">
          A demonstration portal concept for NCPOR, Goa — Ministry of Earth Sciences. All content is fictional demo data.
        </p>
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

      {/* BELOW THE HERO */}
      <ArchiveBand stats={data?.stats} />
      <ExpeditionSection featured={data?.featuredExpedition} expeditions={data?.expeditions} pending={isPending} />
      <StoriesSection pending={isPending || !data} blogs={data ? [...data.blogs, ...data.latestBlogs.filter((b) => !data.blogs.some((x) => x.id === b.id))].slice(0, 5) : []} />
      <LandingTools />
      <StationsSection />
      <TodaySection photo={data?.photoOfDay} fact={fact} term={term} pending={isPending} />
      <NewsletterSection />
    </>
  );
}
