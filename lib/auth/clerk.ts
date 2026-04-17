// Clerk auth helpers — activated when CLERK_SECRET_KEY is set
// Until then, everything falls back to single-tenant "caleums" mode

export const DEFAULT_TENANT = {
  id: 'caleums',
  name: 'Caleums',
  slug: 'caleums',
  plan: 'enterprise' as const,
  creditBalance: '9999.00',
};

export function isClerkConfigured(): boolean {
  return !!(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// Placeholder until Clerk is activated
// When CLERK_SECRET_KEY is set, switch to: import { auth } from '@clerk/nextjs/server'
export async function getCurrentUser(): Promise<{
  userId: string;
  email: string | null;
  tenantId: string;
  role: string;
  name: string;
}> {
  // Default single-tenant mode — Omran is the sole user
  return {
    userId: 'omran',
    email: 'omran@caleums.com',
    tenantId: DEFAULT_TENANT.id,
    role: 'admin',
    name: 'Omran',
  };
}

export async function getTenantId(): Promise<string> {
  const user = await getCurrentUser();
  return user.tenantId;
}
