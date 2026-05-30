const DEMO_EMAIL = 'tenantadmin.demo@seed.local';

export function isDemoEmail(email?: string | null): boolean {
  return Boolean(email?.trim().toLowerCase().includes('demo@seed.local'));
}

export function filterDemoPermissions(permissions: string[], email?: string | null): string[] {
  if (!isDemoEmail(email)) {
    return permissions;
  }

  return [...new Set(permissions.filter((permission) => permission.endsWith(':read') || permission === 'portal:access'))];
}