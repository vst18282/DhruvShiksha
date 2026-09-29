import type { Metadata } from 'next';
import { SatelliteTool } from '@/components/tools/satellite-tool';

export const metadata: Metadata = { title: 'Satellite & Ice Data' };

export default function Page() {
  return <SatelliteTool />;
}
