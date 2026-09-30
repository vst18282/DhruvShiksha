'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { REGION_META } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** One swatch style per marker type — mirrors the `.polar-marker` symbols used on both maps. */
const MARKERS = [
  { symbol: '●', color: '#5BB5E8', label: 'Antarctic research station', shape: 'rounded-full' },
  { symbol: '●', color: '#8B5CF6', label: 'Arctic research station', shape: 'rounded-full' },
  { symbol: '◆', color: '#F59E0B', label: 'NCPOR headquarters, Goa', shape: 'rounded-[4px] rotate-45' },
  { symbol: '▲', color: '#2DD4BF', label: 'Himalayan field site', shape: 'rounded-full' },
  { symbol: '■', color: '#94A3B8', label: 'Historic (decommissioned) station', shape: 'rounded-[4px]' },
];

const TRACK_REGIONS = ['antarctica', 'arctic', 'himalaya', 'southern_ocean'] as const;

function LineSwatch({ color, dashed, faded }: { color: string; dashed?: boolean; faded?: boolean }) {
  return (
    <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden className="shrink-0">
      <line x1="1" y1="5" x2="27" y2="5" stroke={color} strokeWidth={faded ? 1.5 : 3} strokeOpacity={faded ? 0.55 : 1} strokeDasharray={dashed ? '4 3' : undefined} strokeLinecap="round" />
    </svg>
  );
}

/**
 * "How to read this map" panel shared by the Leaflet map and the 3D globe.
 * Opens by default on desktop and collapses to a single button on small screens.
 */
export function MapLegend({ mode, year, source, extra, className }: { mode: '2d' | '3d'; year: number; source: string; extra?: string[]; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(window.innerWidth >= 1024), []);

  return (
    <div className={cn('pointer-events-auto w-[272px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/15 bg-[#0B1F3A]/90 text-white shadow-xl backdrop-blur', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
      >
        <span className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5" aria-hidden /> How to read this {mode === '2d' ? 'map' : 'globe'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="max-h-[340px] space-y-3 overflow-y-auto border-t border-white/10 px-3 pb-3 pt-2 text-[11px] leading-snug text-white/85">
          <section>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">Markers</h3>
            <ul className="space-y-1.5">
              {MARKERS.map((m) => (
                <li key={m.label} className="flex items-center gap-2">
                  <span className={cn('grid h-4 w-4 shrink-0 place-items-center text-[9px] font-black text-[#07162a] ring-1 ring-white/50', m.shape)} style={{ background: m.color }} aria-hidden>
                    <span className={m.shape.includes('rotate-45') ? '-rotate-45' : undefined}>{m.symbol}</span>
                  </span>
                  {m.label}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <span className="relative grid h-4 w-4 shrink-0 place-items-center" aria-hidden><span className="absolute inset-0 rounded-full border-2 border-[#5BB5E8] opacity-60" /><span className="h-1.5 w-1.5 rounded-full bg-[#5BB5E8]" /></span>
                Pulsing ring = staffed, active station
              </li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">Lines &amp; areas</h3>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2"><span className="flex shrink-0 flex-col gap-0.5">{TRACK_REGIONS.map((r) => <LineSwatch key={r} color={REGION_META[r].color} />)}</span><span>Expedition route sailed in {year}, coloured by region ({TRACK_REGIONS.map((r) => REGION_META[r].label).join(', ')})</span></li>
              <li className="flex items-center gap-2"><LineSwatch color="#3B82C4" dashed faded />Earlier routes (before {year})</li>
              <li className="flex items-center gap-2"><LineSwatch color="#F59E0B" dashed />Link from NCPOR Goa to a station{mode === '2d' ? ' (World view)' : ''}</li>
              <li className="flex items-center gap-2"><span className="h-3 w-7 shrink-0 rounded-sm border border-dashed border-[#DBF4FF] bg-[#CDEFFF]/30" aria-hidden />Illustrative sea-ice edge for {year}</li>
              <li className="flex items-center gap-2"><LineSwatch color="#E2E8F0" faded />Latitude / longitude grid</li>
            </ul>
          </section>
          {!!extra?.length && (
            <section>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">Good to know</h3>
              <ul className="list-disc space-y-1 pl-4">{extra.map((line) => <li key={line}>{line}</li>)}</ul>
            </section>
          )}
          <p className="border-t border-white/10 pt-2 text-[10px] text-white/55">{source} Station positions are approximate; tracks and sea ice are demo data.</p>
        </div>
      )}
    </div>
  );
}
