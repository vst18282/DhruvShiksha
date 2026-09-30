'use client';

import { useTabParam } from './use-tab';
import { DashHeader } from './shell';
import { OverviewTab } from '@/components/admin/overview-tab';
import { UsersTab } from '@/components/admin/users-tab';
import { RolesTab } from '@/components/admin/roles-tab';
import { ActivityTab } from '@/components/admin/activity-tab';
import { AuditTab } from '@/components/admin/audit-tab';
import { SocialTab } from '@/components/admin/social-tab';
import { HealthTab } from '@/components/admin/health-tab';
import { SystemTab } from '@/components/admin/system-tab';
import { PublishingTab } from '@/components/admin/publishing-tab';

/** Sections are chosen from the vertical sidebar (?tab=…); there is no horizontal tab bar. */
const SECTIONS: Record<string, { title: string; description: string; render: () => React.ReactNode }> = {
  overview: { title: 'Admin dashboard', description: 'Portal health at a glance: content, storage, users and reach.', render: () => <OverviewTab /> },
  users: { title: 'Users', description: 'Everyone with an account. Click a row to open the profile.', render: () => <UsersTab /> },
  roles: { title: 'Roles & permissions', description: 'What each role can do right now (read-only). Use Change to edit.', render: () => <RolesTab /> },
  activity: { title: 'Content manager activity', description: 'A summary of content creation by content managers, with their post queue.', render: () => <ActivityTab /> },
  audit: { title: 'Audit log', description: 'Every recorded action. Filter, group and click a record for details.', render: () => <AuditTab /> },
  social: { title: 'Social governance', description: 'All connected social accounts. Click an account to open its profile.', render: () => <SocialTab /> },
  health: { title: 'Content health', description: 'Scores from likes and dislikes; issues from reports and reviews.', render: () => <HealthTab /> },
  system: { title: 'System settings', description: 'Workflow, permission table, content rules, defaults and embargo.', render: () => <SystemTab /> },
  publishing: { title: 'Publishing & Insights', description: 'Drafts, the content calendar and social analytics (view only).', render: () => <PublishingTab /> },
};

/** Old links (?tab=approvals / ?tab=moderation) land on their replacements. */
const LEGACY: Record<string, string> = { approvals: 'activity', moderation: 'overview' };

export function AdminDashboard() {
  const [raw] = useTabParam('overview');
  const tab = SECTIONS[raw] ? raw : LEGACY[raw] ?? 'overview';
  const s = SECTIONS[tab];
  return (
    <>
      {/* The overview opens with its own greeting panel instead of a page heading. */}
      {tab !== 'overview' && <DashHeader title={s.title} description={s.description} />}
      <div key={tab}>{s.render()}</div>
    </>
  );
}
