import type { Metadata } from 'next';
import { IceCoreTool } from '@/components/tools/ice-core-tool';

export const metadata: Metadata = { title: 'Ice Core Stratigraphy (3D)' };

export default function Page() {
  return <IceCoreTool />;
}
