'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/misc';
import { RoleChooser } from '@/components/auth/role-chooser';
import { ROLE_LABELS } from '@/lib/constants';
import { postAuthPath } from '@/lib/auth/redirect';
import { useAuthStore } from '@/store/auth';
import type { Role } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Enter a valid email'),
  school: z.string().min(2, 'School or organisation is required'),
  level: z.string().min(1, 'Choose a level'),
  password: z.string().min(8, 'At least 8 characters').regex(/[0-9]/, 'Include a number'),
  terms: z.literal(true, { errorMap: () => ({ message: 'Please accept the demo terms' }) }),
});
type V = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const loginAs = useAuthStore((s) => s.loginAs);
  const [userType, setUserType] = useState<Role>('student');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<V>({ resolver: zodResolver(schema) });

  /**
   * Demo sign-up: no account is created, but we sign the chosen role in and open the page they
   * were heading to, or their role's home (dashboard for staff roles, Explore otherwise).
   */
  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 900));
    const u = await loginAs(userType);
    toast.success('Account created (demo)', { description: `Signed in as ${ROLE_LABELS[u.role]} — nothing was stored on a server.` });
    router.push(postAuthPath(u.role, next));
    router.refresh();
  };

  const err = (k: keyof V) =>
    errors[k] ? (
      <p id={`${k}-err`} className="text-xs text-destructive">
        {errors[k]?.message as string}
      </p>
    ) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-10">
      {/* Choose user type — left of the sign-up fields. */}
      <div className="lg:border-r lg:pr-10">
        <RoleChooser
          name="register-user-type"
          value={userType}
          onChange={setUserType}
          description="The account type you want to demo. Students get learning progress; the other types open their own dashboard."
        />
        <Button variant="outline" className="mt-4 w-full" asChild>
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>
            <LogIn /> I already have an account
          </Link>
        </Button>
      </div>

      {/* Details */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="min-w-0 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          {err('name')}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-email">Email</Label>
          <Input id="r-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          {err('email')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="school">School / organisation</Label>
            <Input id="school" aria-invalid={!!errors.school} {...register('school')} />
            {err('school')}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="level">Level</Label>
            <Select value={watch('level')} onValueChange={(v) => setValue('level', v, { shouldValidate: true })}>
              <SelectTrigger id="level" aria-invalid={!!errors.level}>
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {['Class 5–6', 'Class 7–8', 'Class 9–10', 'Class 11–12', 'Undergraduate', 'Teacher', 'General public'].map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err('level')}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-pw">Password</Label>
          <Input id="r-pw" type="password" aria-invalid={!!errors.password} {...register('password')} />
          {err('password')}
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="terms" checked={watch('terms') === true} onCheckedChange={(c) => setValue('terms', (c === true) as true, { shouldValidate: true })} />
          <Label htmlFor="terms" className="font-normal leading-snug">
            I understand this is a demo and no account is created.
          </Label>
        </div>
        {err('terms')}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          <UserPlus /> Create account as {ROLE_LABELS[userType]}
        </Button>
      </form>
    </div>
  );
}
