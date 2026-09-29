import type { Metadata } from 'next';
import { RequireCan } from '@/components/auth/require-can';
import { UploadWizard } from '@/components/upload/upload-wizard';

export const metadata: Metadata = { title: 'Upload Centre' };

/** Upload Centre: scientists, researchers and content managers (per the editable permission table). */
export default function Page() {
  return (
    <RequireCan anyOf={[{ action: 'upload' }]} adminRedirect="/dashboard/admin?tab=publishing">
      <UploadWizard />
    </RequireCan>
  );
}
