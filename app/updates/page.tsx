import type { Metadata } from 'next';
import { UpdatesFeed } from '@/components/updates/updates-feed';

export const metadata: Metadata = { title: 'Updates', description: 'Posts and announcements from NCPOR scientists and the outreach team (demo).' };

export default function Page() {
  return <UpdatesFeed />;
}
