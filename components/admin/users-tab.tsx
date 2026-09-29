'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Building2, CalendarDays, Clock, Globe2, Mail, Search, UserPlus } from 'lucide-react';
import type { Role, User } from '@/types';
import { StatusBadge, EmptyState } from '@/components/common';
import { DataTable, type Column } from '@/components/common/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, Switch } from '@/components/ui/misc';
import { TableSkeleton } from '@/components/skeletons';
import { useApi, useInvalidate } from '@/hooks/use-queries';
import { api } from '@/lib/mock-api';
import { ROLE_LABELS, CONTENT_TYPE_LABELS } from '@/lib/constants';
import { allItems, itemHref } from '@/lib/archive';
import { AFFILIATION_LABELS, affiliationOf, tenure, type Affiliation } from '@/lib/users';
import { useAuthStore } from '@/store/auth';
import { initials } from '@/lib/utils';

const ROLES: Role[] = ['admin', 'scientist', 'content_manager', 'researcher', 'student'];
const fmtDate = (d: string) => (Number.isNaN(new Date(d).getTime()) ? d : new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }));

const userSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'scientist', 'content_manager', 'researcher', 'student']),
  org: z.string().min(2, 'Organisation required'),
  affiliation: z.enum(['internal', 'external']),
});

/** New accounts get a role once, at creation. Changing roles later is not possible from the portal. */
function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof userSchema>>({ resolver: zodResolver(userSchema), defaultValues: { role: 'student', affiliation: 'external' } });
  const onSubmit = async (v: z.infer<typeof userSchema>) => {
    const today = new Date().toISOString().slice(0, 10);
    await api.saveUser({ id: `u-${Date.now()}`, ...v, active: true, createdAt: today, lastActive: today });
    toast.success(`User ${v.name} created (demo)`);
    reset();
    setOpen(false);
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Create user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>Adds a demo user record (no login credentials are created). The role is set once and cannot be changed later.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {(['name', 'email', 'org'] as const).map((f) => (
            <div key={f} className="space-y-1">
              <Label htmlFor={`cu-${f}`} className="capitalize">
                {f === 'org' ? 'Organisation' : f}
              </Label>
              <Input id={`cu-${f}`} aria-invalid={!!errors[f]} {...register(f)} />
              {errors[f] && <p className="text-xs text-destructive">{errors[f]?.message}</p>}
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cu-role">Role</Label>
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as Role)}>
                <SelectTrigger id="cu-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cu-aff">Internal / external</Label>
              <Select value={watch('affiliation')} onValueChange={(v) => setValue('affiliation', v as Affiliation)}>
                <SelectTrigger id="cu-aff">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">{AFFILIATION_LABELS.internal}</SelectItem>
                  <SelectItem value="external">{AFFILIATION_LABELS.external}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" loading={isSubmitting}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AffiliationBadge({ u }: { u: User }) {
  const a = affiliationOf(u);
  return <Badge variant={a === 'internal' ? 'secondary' : 'outline'}>{a === 'internal' ? 'Internal' : 'External'}</Badge>;
}

/** Profile pop-up: details plus everything the user has done in the portal. */
function ProfileDialog({ user, onClose, onToggleActive }: { user: User | null; onClose: () => void; onToggleActive: (u: User, active: boolean) => void }) {
  const audit = useApi(['audit'], api.getAudit, !!user);
  const posts = useApi(['posts'], api.getPosts, !!user);
  const requests = useApi(['access'], api.getAccessRequests, !!user);
  const me = useAuthStore((s) => s.user);
  if (!user) return null;
  const activity = (audit.data ?? []).filter((a) => a.userId === user.id || (!a.userId && a.actor === user.name));
  const uploads = allItems().filter((i) => i.ownerId === user.id);
  const myPosts = (posts.data ?? []).filter((p) => p.createdBy === user.name);
  const myRequests = (requests.data ?? []).filter((r) => r.requesterId === user.id);
  const aff = affiliationOf(user);
  const self = me?.id === user.id;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 text-lg">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="truncate">{user.name}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="default">{ROLE_LABELS[user.role]}</Badge>
                <AffiliationBadge u={user} />
                <Badge variant={user.active ? 'success' : 'muted'}>{user.active ? 'Active' : 'Deactivated'}</Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="break-all">{user.email}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-xs text-muted-foreground">Organisation</dt>
              <dd>{user.org}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-xs text-muted-foreground">Joined</dt>
              <dd>
                {fmtDate(user.createdAt)} <span className="text-muted-foreground">({tenure(user.createdAt)})</span>
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-xs text-muted-foreground">Last active</dt>
              <dd>{fmtDate(user.lastActive)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:col-span-2">
            <Globe2 className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <div>
              <dt className="text-xs text-muted-foreground">Affiliation</dt>
              <dd>{AFFILIATION_LABELS[aff]}</dd>
            </div>
          </div>
        </dl>

        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {[
            ['Actions logged', activity.length],
            ['Uploads', uploads.length],
            ['Posts', myPosts.length],
            ['Access requests', myRequests.length],
          ].map(([l, v]) => (
            <div key={l} className="rounded-md border p-2">
              <p className="text-lg font-semibold tabular-nums">{v}</p>
              <p className="text-[11px] text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="activity">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="activity">Recent activity</TabsTrigger>
            <TabsTrigger value="uploads">Uploads</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="access">Access requests</TabsTrigger>
          </TabsList>
          <TabsContent value="activity">
            {activity.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No activity recorded.</p>
            ) : (
              <ul className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm">
                {activity.slice(0, 25).map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
                    <span>
                      <span className="font-medium">{a.action}</span> <span className="text-muted-foreground">{a.itemType}:</span> {a.itemTitle}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="uploads">
            {uploads.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No uploads.</p>
            ) : (
              <ul className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm">
                {uploads.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <Link href={itemHref(i)} className="hover:text-primary hover:underline">
                      <span className="text-xs text-muted-foreground">{CONTENT_TYPE_LABELS[i.type].singular}:</span> {i.title}
                    </Link>
                    <StatusBadge status={i.status} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="posts">
            {myPosts.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No posts.</p>
            ) : (
              <ul className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm">
                {myPosts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span>{p.title}</span>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="access">
            {myRequests.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No access requests.</p>
            ) : (
              <ul className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm">
                {myRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span>{r.itemTitle}</span>
                    <Badge variant={r.status === 'approved' ? 'success' : r.status === 'declined' ? 'destructive' : 'warning'}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">Roles are assigned when an account is created and cannot be changed here.</p>
          <div className="flex items-center gap-2">
            <Label htmlFor="pf-active" className="text-sm">
              Account active
            </Label>
            <Switch id="pf-active" checked={user.active} disabled={self} onCheckedChange={(c) => onToggleActive(user, c)} aria-describedby={self ? 'pf-self' : undefined} />
            {self && (
              <span id="pf-self" className="sr-only">
                You cannot deactivate your own account
              </span>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersTab() {
  const { data, isPending } = useApi(['users'], api.getUsers);
  const invalidate = useInvalidate();
  const me = useAuthStore((s) => s.user);
  const [q, setQ] = useState('');
  const sp = useSearchParams();
  // Deep links from the overview (?role=scientist, ?aff=internal).
  const [role, setRole] = useState<Role | 'all'>(() => (ROLES.includes(sp.get('role') as Role) ? (sp.get('role') as Role) : 'all'));
  const [aff, setAff] = useState<Affiliation | 'all'>(() => (sp.get('aff') === 'internal' || sp.get('aff') === 'external' ? (sp.get('aff') as Affiliation) : 'all'));
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () => (data ?? []).filter((u) => (role === 'all' || u.role === role) && (aff === 'all' || affiliationOf(u) === aff) && `${u.name} ${u.email} ${u.org}`.toLowerCase().includes(q.toLowerCase())),
    [data, role, aff, q],
  );
  const open = (data ?? []).find((u) => u.id === openId) ?? null;

  const setActive = async (u: User, active: boolean) => {
    if (u.id === me?.id) return toast.error('You cannot deactivate your own account');
    await api.saveUser({ ...u, active });
    toast.success(`${u.name} ${active ? 'activated' : 'deactivated'}`);
    invalidate([['users'], ['audit']]);
  };

  const cols: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (u) => u.name,
      cell: (u) => (
        <div className="flex items-center gap-2">
          <Avatar className="hidden h-8 w-8 sm:flex">
            <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'org', header: 'Organisation', cell: (u) => u.org, className: 'hidden xl:table-cell' },
    { key: 'role', header: 'Role', sortValue: (u) => ROLE_LABELS[u.role], cell: (u) => <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge> },
    { key: 'aff', header: 'Internal / external', sortValue: (u) => affiliationOf(u), cell: (u) => <AffiliationBadge u={u} />, className: 'hidden md:table-cell' },
    { key: 'joined', header: 'Joined', sortValue: (u) => u.createdAt, cell: (u) => <span className="whitespace-nowrap">{fmtDate(u.createdAt)}</span>, className: 'hidden sm:table-cell' },
    { key: 'last', header: 'Last active', sortValue: (u) => u.lastActive, cell: (u) => <span className="whitespace-nowrap">{fmtDate(u.lastActive)}</span>, className: 'hidden lg:table-cell' },
    {
      key: 'active',
      header: 'Active',
      sortValue: (u) => Number(u.active),
      cell: (u) => (
        // Stop propagation so toggling doesn't also open the profile pop-up.
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="inline-flex">
          <Switch checked={u.active} disabled={u.id === me?.id} onCheckedChange={(c) => setActive(u, c)} aria-label={`${u.active ? 'Deactivate' : 'Activate'} ${u.name}`} />
        </span>
      ),
    },
  ];

  const internal = (data ?? []).filter((u) => affiliationOf(u) === 'internal').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or organisation…" aria-label="Search users" className="pl-9" />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as Role | 'all')}>
          <SelectTrigger className="w-40" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={aff} onValueChange={(v) => setAff(v as Affiliation | 'all')}>
          <SelectTrigger className="w-40" aria-label="Filter by internal or external">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Internal & external</SelectItem>
            <SelectItem value="internal">Internal only</SelectItem>
            <SelectItem value="external">External only</SelectItem>
          </SelectContent>
        </Select>
        <CreateUserDialog onCreated={() => invalidate([['users'], ['audit']])} />
      </div>
      {data && (
        <p className="text-xs text-muted-foreground">
          {data.length} users · {internal} internal · {data.length - internal} external · click a row to open the profile
        </p>
      )}
      {isPending ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="No users match" description="Try another search or filter." />
      ) : (
        <DataTable columns={cols} rows={rows} rowKey={(u) => u.id} caption="Users" onRowClick={(u) => setOpenId(u.id)} rowLabel={(u) => `Open profile of ${u.name}`} />
      )}
      <ProfileDialog user={open} onClose={() => setOpenId(null)} onToggleActive={setActive} />
    </div>
  );
}
