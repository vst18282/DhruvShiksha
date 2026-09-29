import type { Metadata } from 'next';
import { AuroraPanel } from '@/components/auth/aurora-panel';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Register as a student' };

export default function RegisterPage() {
  return (
    <div className="grid min-h-[calc(100vh-6rem)] lg:grid-cols-2">
      <AuroraPanel title="Join the polar classroom" subtitle="Save bookmarks, track quiz badges and ask real (demo) scientists your questions." />
      <div className="flex items-center justify-center px-4 py-10">
        <RegisterForm />
      </div>
    </div>
  );
}
