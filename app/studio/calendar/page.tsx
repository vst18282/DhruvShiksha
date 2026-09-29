import type { Metadata } from 'next';
import { CalendarView } from '@/components/studio/calendar-view';
import { RequireCan } from '@/components/auth/require-can';

export const metadata: Metadata = { title: 'Content calendar' };

export default function Page() {
  return (
    <RequireCan anyOf={[{ action: 'use_studio' }]}>
      <CalendarView />
    </RequireCan>
  );
}
