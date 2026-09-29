import type { Metadata } from 'next';
import { GeospaceTool } from '@/components/tools/geospace-tool';

export const metadata: Metadata = { title: 'Geospace Observatory' };

export default function Page() {
  return <GeospaceTool />;
}
