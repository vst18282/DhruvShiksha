import type { Metadata } from 'next';
import { ApprovalQueue } from '@/components/approvals/approval-queue';
import { RequireCan } from '@/components/auth/require-can';
import { HideForScientist } from '@/components/studio/hide-for-scientist';

export const metadata: Metadata = { title: 'Approval queue' };

export default function Page() {
  return (
    <HideForScientist>
      <RequireCan anyOf={[{ action: 'approve_publish' }]}>
        <h1 className="mb-1 text-2xl font-semibold">Approval queue</h1>
        <p className="mb-5 text-sm text-muted-foreground">Posts and uploads from scientists and researchers awaiting review. Scientists can record science-accuracy reviews; content managers approve and publish.</p>
        <ApprovalQueue />
      </RequireCan>
    </HideForScientist>
  );
}
