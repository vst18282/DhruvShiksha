import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './login-form';
import { AuroraPanel } from '@/components/auth/aurora-panel';
import { Skeleton } from '@/components/skeletons';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <div className="grid min-h-[calc(100vh-6rem)] lg:grid-cols-2">
      <AuroraPanel title="Welcome back to the ice" subtitle="Sign in with a demo role to explore dashboards, the Content Studio, uploads and learning progress." />
      <div className="flex items-center justify-center px-4 py-10">
        <Suspense fallback={<Skeleton className="h-[520px] w-full max-w-md" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
