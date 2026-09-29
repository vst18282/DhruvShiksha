import type { Metadata } from 'next';
import { Forbidden } from '@/components/common/forbidden';

export const metadata: Metadata = { title: 'Access denied' };

export default function ForbiddenPage() {
  return (
    <div className="container py-16">
      <Forbidden />
    </div>
  );
}
