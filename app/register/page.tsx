import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Skeleton } from '@/components/skeletons';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Sign up' };

export default function RegisterPage() {
  return (
    <AuthShell
      mode="register"
      title="Join the polar classroom"
      subtitle="Choose a user type on the left, then fill in your details. Save bookmarks, track quiz badges and ask real (demo) scientists your questions."
    >
      <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
