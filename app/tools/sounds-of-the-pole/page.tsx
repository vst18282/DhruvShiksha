import type { Metadata } from 'next';
import { SoundsTool } from '@/components/tools/sounds-tool';

export const metadata: Metadata = { title: 'Sounds of the Pole' };

export default function Page() {
  return <SoundsTool />;
}
