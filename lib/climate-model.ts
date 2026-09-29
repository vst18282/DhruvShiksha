/**
 * EDUCATIONAL TOY MODEL — indicative, not a scientific projection.
 *
 * Global warming follows a simple path set by the pathway preset + peak level + overshoot years.
 * Each tipping element has a warming threshold with uncertainty. Every year we compute an
 * exceedance probability p = logistic((Teff − threshold) / (uncertainty/2)); p accumulates as
 * "exposure", and the element tips once exposure ≥ timescale/3. Tipped elements add
 * warming to others (cascade) and, for ice sheets, add sea-level rise. Recovery requires
 * Teff below a lower "recovery" threshold for 20 consecutive years (hysteresis).
 * Threshold values are loosely inspired by published assessments but simplified for teaching.
 */

export type ElementId = 'arctic_sea_ice' | 'greenland' | 'west_antarctic' | 'permafrost' | 'himalayan' | 'amoc' | 'southern_sea_ice';
export type ElementState = 'safe' | 'at_risk' | 'tipped';
export type Pathway = 'low' | 'medium' | 'high';

export interface TippingElement {
  id: ElementId;
  name: string;
  short: string;
  threshold: number;
  uncertainty: number;
  timescale: number;
  recovery: number;
  slrPerYear: number;
  globalFeedback: number;
  blurb: string;
}

export const ELEMENTS: TippingElement[] = [
  { id: 'arctic_sea_ice', name: 'Arctic summer sea ice', short: 'Arctic ice', threshold: 1.8, uncertainty: 0.5, timescale: 10, recovery: 1.5, slrPerYear: 0, globalFeedback: 0.02, blurb: 'Ice-free Arctic summers darken the ocean and amplify warming.' },
  { id: 'greenland', name: 'Greenland Ice Sheet', short: 'Greenland', threshold: 1.6, uncertainty: 0.6, timescale: 40, recovery: 1.0, slrPerYear: 0.003, globalFeedback: 0, blurb: 'Irreversible melt over centuries could raise seas by metres.' },
  { id: 'west_antarctic', name: 'West Antarctic Ice Sheet', short: 'W. Antarctica', threshold: 1.8, uncertainty: 0.6, timescale: 40, recovery: 1.0, slrPerYear: 0.004, globalFeedback: 0, blurb: 'Marine ice-sheet instability could commit to large sea-level rise.' },
  { id: 'permafrost', name: 'Boreal permafrost', short: 'Permafrost', threshold: 2.0, uncertainty: 0.7, timescale: 25, recovery: 1.7, slrPerYear: 0, globalFeedback: 0.1, blurb: 'Thawing soils release CO₂ and methane, adding extra warming.' },
  { id: 'himalayan', name: 'Himalayan glacier mass', short: 'Himalaya', threshold: 1.7, uncertainty: 0.6, timescale: 20, recovery: 1.4, slrPerYear: 0.0004, globalFeedback: 0, blurb: 'Glacier loss threatens long-term river flow for South Asia.' },
  { id: 'amoc', name: 'Atlantic overturning (AMOC)', short: 'AMOC', threshold: 3.0, uncertainty: 1.0, timescale: 30, recovery: 2.5, slrPerYear: 0.0008, globalFeedback: 0, blurb: 'A slowdown shifts rainfall belts, including monsoon patterns.' },
  { id: 'southern_sea_ice', name: 'Southern Ocean sea ice', short: 'S. Ocean ice', threshold: 2.2, uncertainty: 0.7, timescale: 15, recovery: 1.9, slrPerYear: 0, globalFeedback: 0.01, blurb: 'Less sea ice exposes ice shelves and changes ocean circulation.' },
];

export const INTERACTIONS: { from: ElementId; to: ElementId; boost: number }[] = [
  { from: 'arctic_sea_ice', to: 'greenland', boost: 0.15 },
  { from: 'arctic_sea_ice', to: 'permafrost', boost: 0.1 },
  { from: 'greenland', to: 'amoc', boost: 0.4 },
  { from: 'amoc', to: 'west_antarctic', boost: 0.2 },
  { from: 'amoc', to: 'southern_sea_ice', boost: 0.2 },
  { from: 'west_antarctic', to: 'southern_sea_ice', boost: 0.1 },
  { from: 'permafrost', to: 'himalayan', boost: 0.05 },
];

export interface ScenarioInput {
  pathway: Pathway;
  peak: number;
  horizon: number;
  overshoot: number;
}

export const PATHWAY_DEFAULTS: Record<Pathway, { peak: number; label: string; note: string }> = {
  low: { peak: 1.6, label: 'Low emissions', note: 'Rapid cuts: warming peaks mid-century then slowly declines.' },
  medium: { peak: 2.7, label: 'Medium emissions', note: 'Current policies: warming rises then plateaus.' },
  high: { peak: 4.4, label: 'High emissions', note: 'Continued growth: warming keeps rising to 2100.' },
};

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function warmingAt(y: number, s: ScenarioInput): number {
  const T0 = 1.3;
  if (s.pathway === 'high') return T0 + (s.peak - T0) * Math.min(1, (y - 2025) / 75);
  if (s.pathway === 'medium') return T0 + (s.peak - T0) * smooth((y - 2025) / 45);
  const peakYear = 2050;
  if (y <= peakYear) return T0 + (s.peak - T0) * smooth((y - 2025) / 25);
  if (y <= peakYear + s.overshoot) return s.peak;
  return Math.max(Math.max(1.2, s.peak - 0.6), s.peak - 0.025 * (y - peakYear - s.overshoot));
}

export interface YearRow {
  year: number;
  warming: number;
  seaLevel: number;
  arcticIce: number;
  southernIce: number;
}

export interface ElementResult {
  id: ElementId;
  state: ElementState;
  probability: number;
  tippedYear?: number;
}

export interface ScenarioResult {
  input: ScenarioInput;
  rows: YearRow[];
  elements: ElementResult[];
  peakWarming: number;
  seaLevel2100: number;
}

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

export function simulate(input: ScenarioInput): ScenarioResult {
  const state = new Map<ElementId, { exposure: number; tipped: boolean; tippedYear?: number; coolYears: number; p: number }>();
  ELEMENTS.forEach((e) => state.set(e.id, { exposure: 0, tipped: false, coolYears: 0, p: 0 }));
  const rows: YearRow[] = [];
  let sl = 0;
  let peak = 0;
  for (let y = 2025; y <= Math.max(2026, input.horizon); y++) {
    const feedback = ELEMENTS.reduce((a, e) => a + (state.get(e.id)!.tipped ? e.globalFeedback : 0), 0);
    const T = warmingAt(y, input) + feedback;
    peak = Math.max(peak, T);
    for (const e of ELEMENTS) {
      const st = state.get(e.id)!;
      const boost = INTERACTIONS.filter((i) => i.to === e.id && state.get(i.from)!.tipped).reduce((a, i) => a + i.boost, 0);
      const Teff = T + boost;
      st.p = logistic((Teff - e.threshold) / (e.uncertainty / 2));
      if (!st.tipped) {
        st.exposure = Math.max(0, st.exposure + st.p - 0.05);
        if (st.exposure >= e.timescale / 3) {
          st.tipped = true;
          st.tippedYear = y;
        }
      } else {
        st.coolYears = Teff < e.recovery ? st.coolYears + 1 : 0;
        if (st.coolYears >= 20) {
          st.tipped = false;
          st.exposure = e.timescale / 6;
          st.coolYears = 0;
        }
      }
    }
    sl += 0.0022 + 0.0014 * Math.max(0, T - 1) + ELEMENTS.reduce((a, e) => a + (state.get(e.id)!.tipped ? e.slrPerYear : 0), 0);
    const arcticTipped = state.get('arctic_sea_ice')!.tipped;
    rows.push({
      year: y,
      warming: Math.round(T * 100) / 100,
      seaLevel: Math.round(sl * 1000) / 1000,
      arcticIce: Math.round(Math.max(0, arcticTipped ? Math.min(1, 4.4 - 1.7 * (T - 1.3)) : 4.4 - 1.7 * (T - 1.3)) * 100) / 100,
      southernIce: Math.round(Math.max(0, 2.9 - 0.7 * (T - 1.3) - (state.get('southern_sea_ice')!.tipped ? 0.8 : 0)) * 100) / 100,
    });
  }
  const at = rows[rows.length - 1];
  const elements: ElementResult[] = ELEMENTS.map((e) => {
    const st = state.get(e.id)!;
    return { id: e.id, state: st.tipped ? 'tipped' : st.p >= 0.2 ? 'at_risk' : 'safe', probability: Math.round(st.p * 100) / 100, tippedYear: st.tipped ? st.tippedYear : undefined };
  });
  return { input, rows, elements, peakWarming: Math.round(peak * 100) / 100, seaLevel2100: at.seaLevel };
}

export function indiaImpacts(r: ScenarioResult): string[] {
  const tipped = new Set(r.elements.filter((e) => e.state === 'tipped').map((e) => e.id));
  const out: string[] = [];
  if (tipped.has('greenland') || tipped.has('west_antarctic')) out.push('Coastal cities such as Mumbai, Chennai, Kolkata and Goa face a long-term commitment to higher sea levels, storm surges and saltwater intrusion.');
  else out.push(`Sea level rises about ${Math.round(r.seaLevel2100 * 100)} cm by the horizon in this toy run — still important for low-lying coasts and islands like Lakshadweep.`);
  if (tipped.has('himalayan')) out.push('Himalayan glacier loss threatens dry-season flow in the Ganga, Indus and Brahmaputra basins and hydropower planning.');
  if (tipped.has('amoc')) out.push('An AMOC slowdown could shift tropical rain belts, making the Indian monsoon less reliable.');
  if (tipped.has('arctic_sea_ice')) out.push('Ice-free Arctic summers can alter jet-stream patterns linked to extreme weather in Asia.');
  if (tipped.has('permafrost')) out.push('Permafrost emissions add extra warming, making every target harder to meet.');
  if (r.peakWarming > 2) out.push('Above 2 °C, heatwaves, heavy-rain events and crop stress become markedly more frequent across India.');
  if (out.length === 1 && !tipped.size) out.push('Keeping warming low protects most tipping elements — the best outcome for India’s coasts, rivers and monsoon.');
  return out;
}
