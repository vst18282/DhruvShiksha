import type { Metadata } from 'next';
import { RequireCan } from '@/components/auth/require-can';
import { AccountsView } from '@/components/studio/accounts-view';

export const metadata: Metadata = { title: 'Social accounts' };

export default function Page() {
  return (
    <RequireCan anyOf={[{ action: 'manage_social_accounts', full: true }]}>
      <AccountsView />
    </RequireCan>
  );
}
