'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ChevronDown, Copy, Info, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/misc';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RoleChooser } from '@/components/auth/role-chooser';
import { DEMO_CREDENTIALS } from '@/lib/auth/demo-users';
import { ROLE_LABELS } from '@/lib/constants';
import { postAuthPath } from '@/lib/auth/redirect';
import { useAuthStore } from '@/store/auth';
import type { Role, User } from '@/types';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const { login, loginAs } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [asRole, setAsRole] = useState<Role | null>(null);
  const [userType, setUserType] = useState<Role | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  /**
   * Admins, scientists and content managers land on their dashboard; researchers and students on
   * Explore. A `?next=` target (from the middleware or the landing page) still wins, as long as
   * the role is allowed there.
   */
  const afterLogin = (u: User) => {
    toast.success(`Welcome, ${u.name}`, { description: `Signed in as ${ROLE_LABELS[u.role]} (demo)` });
    router.push(postAuthPath(u.role, next));
    router.refresh();
  };

  /** Picking a user type pre-fills that role's demo credentials so the form is ready to submit. */
  const pickUserType = (role: Role) => {
    setUserType(role);
    setError(null);
    const c = DEMO_CREDENTIALS.find((d) => d.role === role);
    if (!c) return;
    setValue('email', c.email, { shouldValidate: false });
    setValue('password', c.password, { shouldValidate: false });
  };

  const onSubmit = async (v: FormValues) => {
    setError(null);
    try {
      afterLogin(await login(v.email, v.password));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-10">
      {/* Choose user type — left of the login fields. */}
      <div className="lg:border-r lg:pr-10">
        <RoleChooser
          name="login-user-type"
          value={userType}
          onChange={pickUserType}
          description="Pick a demo role. We fill in its credentials so you can sign in straight away, or use the one-click button below."
        />
        <Button
          className="mt-4 w-full"
          variant="outline"
          disabled={!userType || !!asRole}
          loading={!!asRole}
          onClick={async () => {
            if (!userType) return;
            setAsRole(userType);
            const u = await loginAs(userType);
            setAsRole(null);
            afterLogin(u);
          }}
        >
          {userType ? `Continue as ${ROLE_LABELS[userType]}` : 'Select a user type'}
        </Button>
      </div>

      {/* Credentials */}
      <div className="min-w-0">
        <div role="note" className="mb-5 flex gap-2 rounded-md border border-polar-amber/40 bg-polar-amber/10 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-polar-amber" aria-hidden />
          <p>This is a frontend-only demo. Sessions are stored in your browser and nothing is sent to a server.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} {...register('email')} />
            {errors.email && (
              <p id="email-err" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <ForgotPassword />
            </div>
            <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'pw-err' : undefined} {...register('password')} />
            {errors.password && (
              <p id="pw-err" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={isSubmitting}>
            <LogIn /> Log in
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> new to DhruvShiksha? <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="secondary" className="w-full" asChild>
          <Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}>
            <UserPlus /> Sign up for an account
          </Link>
        </Button>

        <Collapsible className="mt-6 rounded-lg border bg-card">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium [&[data-state=open]>svg]:rotate-180">
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden /> Demo credentials
            </span>
            <ChevronDown className="h-4 w-4 transition-transform" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Demo credentials</caption>
              <thead className="border-y bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Role</th>
                  <th scope="col" className="px-2 py-2 font-medium">Email</th>
                  <th scope="col" className="px-2 py-2 font-medium">Password</th>
                  <th scope="col" className="sr-only">Fill</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_CREDENTIALS.map((c) => (
                  <tr key={c.role} className="border-b last:border-0">
                    <td className="px-4 py-2">{ROLE_LABELS[c.role]}</td>
                    <td className="px-2 py-2 font-mono">{c.email}</td>
                    <td className="px-2 py-2 font-mono">{c.password}</td>
                    <td className="px-2 py-2">
                      <Button variant="ghost" size="icon" aria-label={`Fill ${ROLE_LABELS[c.role]} credentials`} onClick={() => pickUserType(c.role)}>
                        <Copy />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function ForgotPassword() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-xs font-medium text-primary hover:underline">Forgot password?</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password (demo)</DialogTitle>
          <DialogDescription>We’ll pretend to email you a reset link. Nothing is actually sent.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error('Enter a valid email');
            setBusy(true);
            setTimeout(() => {
              setBusy(false);
              setOpen(false);
              toast.success('Reset link sent (demo)', { description: `If ${email} exists, a link is on its way.` });
            }, 800);
          }}
          className="space-y-3"
        >
          <Label htmlFor="reset-email">Email</Label>
          <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" loading={busy} className="w-full">
            Send reset link
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
