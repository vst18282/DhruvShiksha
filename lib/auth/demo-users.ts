import type { Role, User } from '@/types';

/**
 * DEMO ONLY: plaintext credentials for the five demo roles.
 * In a real deployment these would never ship to the browser; authentication
 * would be handled by an identity provider (e.g. Parichay / OAuth / SAML).
 */
export const DEMO_CREDENTIALS: { role: Role; email: string; password: string; user: User }[] = [
  {
    role: 'admin',
    email: 'admin@ncpor.demo',
    password: 'Admin@123',
    user: { id: 'u-admin', name: 'Anika Rao', email: 'admin@ncpor.demo', role: 'admin', active: true, org: 'NCPOR IT Cell (Demo)', createdAt: '2021-04-01', lastActive: '2026-09-28', affiliation: 'internal' },
  },
  {
    role: 'scientist',
    email: 'scientist@ncpor.demo',
    password: 'Scientist@123',
    user: { id: 'u-scientist', name: 'Dr. Vikram Menon', email: 'scientist@ncpor.demo', role: 'scientist', active: true, org: 'NCPOR Cryosphere Studies (Demo)', createdAt: '2019-07-12', lastActive: '2026-09-28', affiliation: 'internal' },
  },
  {
    role: 'content_manager',
    email: 'content@ncpor.demo',
    password: 'Content@123',
    user: { id: 'u-content', name: 'Meera Kulkarni', email: 'content@ncpor.demo', role: 'content_manager', active: true, org: 'NCPOR Outreach & Media Cell (Demo)', createdAt: '2022-01-10', lastActive: '2026-09-28', affiliation: 'internal' },
  },
  {
    role: 'researcher',
    email: 'researcher@ncpor.demo',
    password: 'Researcher@123',
    user: { id: 'u-researcher', name: 'Dr. Farah Siddiqui', email: 'researcher@ncpor.demo', role: 'researcher', active: true, org: 'Partner University (Demo)', createdAt: '2023-03-05', lastActive: '2026-09-27', affiliation: 'external' },
  },
  {
    role: 'student',
    email: 'student@ncpor.demo',
    password: 'Student@123',
    user: { id: 'u-student', name: 'Aarav Naik', email: 'student@ncpor.demo', role: 'student', active: true, org: 'Class 8, Demo School, Goa', createdAt: '2025-06-20', lastActive: '2026-09-28', affiliation: 'external' },
  },
];

export function demoUserForRole(role: Role): User {
  return DEMO_CREDENTIALS.find((c) => c.role === role)!.user;
}
