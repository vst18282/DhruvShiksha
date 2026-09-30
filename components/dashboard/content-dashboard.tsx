'use client';

import { useSearchParams } from 'next/navigation';
import { BarChart3, CalendarDays, ClipboardCheck, PenSquare } from 'lucide-react';
import { DashHeader } from './shell';
import { WelcomePanel } from './welcome-panel';
import { useAuthStore } from '@/store/auth';
import { ContentOverview } from './content-overview';
import { ContentCms } from './content-cms';
import { VisibilityManager } from '@/components/visibility/visibility-manager';
import { Forbidden } from '@/components/common/forbidden';
import { useCan } from '@/lib/permissions';

type Section = 'overview' | 'cms' | 'visibility';

const SECTIONS: Record<Section, { title: string; description: string }> = {
  overview: { title: 'Outreach & media', description: 'Review contributions, plan the calendar and follow how your posts perform.' },
  cms: { title: 'Blog editor & curation', description: 'Write articles for the website and choose what the homepage features.' },
  visibility: { title: 'Visibility', description: 'Decide which roles can see each published item and post.' },
};

/**
 * Content manager dashboard. Each sidebar link (?tab=) opens one section on its own, so there is
 * no in-page tab strip. Moderation was retired; old ?tab=moderation links land on the overview.
 */
export function ContentDashboard() {
  const tab = useSearchParams().get('tab');
  const section: Section = tab === 'cms' || tab === 'visibility' ? tab : 'overview';
  const { can } = useCan();
  const meta = SECTIONS[section];
  const user = useAuthStore((s) => s.user)!;
  return (
    <>
      {section === 'overview' ? (
        <WelcomePanel
          eyebrow="Outreach & media desk"
          name={user.name.split(' ').slice(0, 2).join(' ')}
          subtitle={`${user.org} · Review contributions, plan the calendar and follow how your posts perform.`}
          links={[
            { href: '/studio', label: 'New post', icon: PenSquare },
            { href: '/studio/approvals', label: 'Approval queue', icon: ClipboardCheck },
            { href: '/studio/calendar', label: 'Calendar', icon: CalendarDays },
            { href: '/studio/analytics', label: 'Analytics', icon: BarChart3 },
          ]}
          searchPlaceholder="Find a report, dataset or story to share…"
          tip="Tip: open any archive item and use “Generate post” to draft from it."
        />
      ) : (
        <DashHeader title={meta.title} description={meta.description} />
      )}
      {section === 'overview' && <ContentOverview />}
      {section === 'cms' && <ContentCms />}
      {section === 'visibility' && (can('set_visibility') ? <VisibilityManager /> : <Forbidden need="Change who can see content" />)}
    </>
  );
}
