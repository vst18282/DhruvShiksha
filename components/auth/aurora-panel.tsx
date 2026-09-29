import { PolarImage } from '@/components/common/polar-image';
import { DemoBadge } from '@/components/common';

/** Decorative left-hand panel for auth pages. */
export function AuroraPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="relative hidden overflow-hidden lg:block">
      <PolarImage variant="aurora" seed="login-aurora" alt="" decorative className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-polar-navy via-polar-navy/40 to-transparent" />
      <div className="relative flex h-full flex-col justify-end p-10 text-white">
        <DemoBadge className="mb-4 w-fit" />
        <h2 className="max-w-md text-3xl font-semibold leading-tight">{title}</h2>
        <p className="mt-3 max-w-md text-white/80">{subtitle}</p>
        <ul className="mt-6 grid max-w-md grid-cols-2 gap-3 text-sm text-white/85">
          <li className="glass rounded-md p-3">4 polar stations</li>
          <li className="glass rounded-md p-3">20 expeditions (demo)</li>
          <li className="glass rounded-md p-3">Open datasets & DOIs</li>
          <li className="glass rounded-md p-3">Human-approved AI outreach</li>
        </ul>
      </div>
    </div>
  );
}
