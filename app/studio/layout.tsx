import { DashboardShell } from '@/components/dashboard/shell';
import { StudioNav } from '@/components/studio/studio-nav';
import { RequireCan } from '@/components/auth/require-can';

/** Studio is for roles that write or review posts. Admins are redirected to Publishing & Insights. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <RequireCan anyOf={[{ action: 'use_studio' }, { action: 'approve_publish' }]} adminRedirect="/dashboard/admin?tab=publishing">
        <StudioNav />
        {children}
      </RequireCan>
    </DashboardShell>
  );
}
