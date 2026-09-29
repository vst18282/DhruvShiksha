import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { SocialAccountProfile } from '@/components/admin/social-account-profile';

export const metadata: Metadata = { title: 'Social account profile' };

export default function Page({ params }: { params: { accountId: string } }) {
  return (
    <RequireRole roles={['admin']}>
      <SocialAccountProfile accountId={decodeURIComponent(params.accountId)} />
    </RequireRole>
  );
}
