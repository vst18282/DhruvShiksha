import { AudioLines, Cylinder, FlaskConical, Globe2, Map, Orbit, Satellite } from 'lucide-react';
import type { ToolIcon as ToolIconName } from '@/lib/nav';

const ICONS = { map: Map, globe: Globe2, core: Cylinder, sound: AudioLines, satellite: Satellite, sandbox: FlaskConical, geospace: Orbit };

export function ToolIcon({ name, className }: { name: ToolIconName; className?: string }) {
  const I = ICONS[name];
  return <I className={className} aria-hidden />;
}
