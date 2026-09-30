import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from './login-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { Skeleton } from '@/components/skeletons';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthShell
      mode="login"
      title="Welcome back to the ice"
      subtitle="Choose a demo user type on the left, then sign in to reach dashboards, the Content Studio, uploads and learning progress."
    >
      <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
