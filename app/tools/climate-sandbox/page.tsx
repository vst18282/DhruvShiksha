import type { Metadata } from 'next';
import { ClimateSandbox } from '@/components/tools/climate-sandbox';

export const metadata: Metadata = { title: 'Climate Sandbox — Tipping Points' };

export default function Page() {
  return <ClimateSandbox />;
}
