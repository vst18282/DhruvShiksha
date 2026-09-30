import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { MyDataItems } from '@/components/studio/my-data-items';

export const metadata: Metadata = { title: 'Published to Data' };

export default function Page() {
  return (
    <RequireRole roles={['scientist']}>
      <MyDataItems />
    </RequireRole>
  );
}
