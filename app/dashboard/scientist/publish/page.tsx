import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { ScientistPublish } from '@/components/dashboard/scientist-publish';

export const metadata: Metadata = { title: 'Publish to Data' };

/** Scientists publish files to the Data catalogue directly, without an approval step. */
export default function Page() {
  return (
    <RequireRole roles={['scientist']}>
      <ScientistPublish />
    </RequireRole>
  );
}
