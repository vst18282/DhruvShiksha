'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/misc';
import { DemoBadge } from '@/components/common';

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
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<V>({ resolver: zodResolver(schema) });

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 900));
    toast.success('Registration received (demo)', { description: 'Use student@ncpor.demo / Student@123 to log in during the demo.' });
    router.push('/login');
  };

  const err = (k: keyof V) =>
    errors[k] ? (
      <p id={`${k}-err`} className="text-xs text-destructive">
        {errors[k]?.message as string}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-md space-y-4">
      <div>
        <DemoBadge className="mb-3" />
        <h1 className="text-2xl font-semibold">Register as a student</h1>
        <p className="mt-1 text-sm text-muted-foreground">A mock form — it only shows a success message.</p>
      </div>
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
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
