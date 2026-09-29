import type { ToolIcon } from '@/lib/nav';

/** Tiny animated SVG previews for tool cards (decorative). */
export function ToolPreview({ icon }: { icon: ToolIcon }) {
  const common = 'h-full w-full';
  switch (icon) {
    case 'map':
      return (
        <svg viewBox="0 0 200 110" className={common} aria-hidden>
          <rect width="200" height="110" fill="#0B1F3A" />
          <circle cx="100" cy="55" r="46" fill="#123a63" stroke="#5BB5E8" strokeOpacity=".3" />
          <path d="M70 48 q15 -22 38 -12 q22 6 20 26 q-6 20 -30 18 q-26 -2 -28 -32z" fill="#e6f2fb" />
          <circle cx="82" cy="46" r="3" fill="#F59E0B" />
          <circle cx="118" cy="66" r="3" fill="#F59E0B" />
          <path d="M20 100 Q60 70 82 46" stroke="#2DD4BF" strokeDasharray="3 3" fill="none" />
        </svg>
      );
    case 'globe':
      return (
        <svg viewBox="0 0 200 110" className={common} aria-hidden>
          <rect width="200" height="110" fill="#06142b" />
          <circle cx="100" cy="55" r="44" fill="#1d4f82" />
          <ellipse cx="100" cy="55" rx="44" ry="16" fill="none" stroke="#5BB5E8" strokeOpacity=".4" />
          <ellipse cx="100" cy="55" rx="18" ry="44" fill="none" stroke="#5BB5E8" strokeOpacity=".4" className="motion-decor animate-pulse" />
          <circle cx="100" cy="55" r="50" fill="none" stroke="#2DD4BF" strokeOpacity=".35" strokeWidth="4" />
        </svg>
      );
    case 'core':
      return (
        <svg viewBox="0 0 200 110" className={common} aria-hidden>
          <rect width="200" height="110" fill="#0B1F3A" />
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x="80" y={8 + i * 9.5} width="40" height="9" fill={i % 3 === 0 ? '#9fc3e0' : '#dbeefa'} opacity={0.6 + (i % 4) * 0.1} />
          ))}
          <rect x="80" y="55" width="40" height="3" fill="#F59E0B" />
        </svg>
      );
    case 'sound':
      return (
        <svg viewBox="0 0 200 110" className={common} aria-hidden>
          <rect width="200" height="110" fill="#0B1F3A" />
          {Array.from({ length: 30 }).map((_, i) => {
            const h = 10 + Math.abs(Math.sin(i * 0.7)) * 60;
            return <rect key={i} x={12 + i * 6} y={55 - h / 2} width="3" height={h} rx="1.5" fill={i % 2 ? '#2DD4BF' : '#8B5CF6'} />;
          })}
        </svg>
      );
    case 'satellite':
      return (
        <svg viewBox="0 0 200 110" className={common} aria-hidden>
          <defs>
            <linearGradient id="sat-g" x1="0" x2="1">
              <stop offset="0" stopColor="#0B1F3A" />
              <stop offset="0.5" stopColor="#3B82C4" />
              <stop offset="1" stopColor="#f5faff" />
            </linearGradient>
          </defs>
          <rect width="200" height="110" fill="url(#sat-g)" />
          <line x1="100" y1="0" x2="100" y2="110" stroke="#fff" strokeWidth="2" />
          <circle cx="100" cy="55" r="7" fill="#fff" />
        </svg>
      );
    case 'sandbox':
      return (
        <svg viewBox="0 0 200 110" className={common} aria-hidden>
          <rect width="200" height="110" fill="#0B1F3A" />
          <path d="M10 95 C 60 90, 110 70, 190 20" stroke="#F59E0B" strokeWidth="3" fill="none" />
          <line x1="10" y1="60" x2="190" y2="60" stroke="#ef4444" strokeDasharray="4 4" />
          {[40, 90, 140].map((x, i) => (
            <circle key={x} cx={x} cy={30} r="10" fill={['#22c55e', '#F59E0B', '#ef4444'][i]} opacity=".85" />
          ))}
        </svg>
      );
    case 'geospace':
      return (
        <svg viewBox="0 0 200 110" className={common} aria-hidden>
          <rect width="200" height="110" fill="#030a18" />
          <circle cx="100" cy="55" r="22" fill="#1d4f82" />
          <ellipse cx="100" cy="55" rx="40" ry="34" fill="none" stroke="#2DD4BF" strokeWidth="5" strokeOpacity=".6" className="motion-decor animate-pulse" />
          <circle cx="20" cy="55" r="12" fill="#F59E0B" />
        </svg>
      );
  }
}
