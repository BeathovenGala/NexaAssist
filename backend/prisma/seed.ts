import {
  PrismaClient,
  RoleName,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type PermissionSeed = {
  code: string;
  module: string;
  description: string;
};

const permissions: PermissionSeed[] = [
  // Users / tenancy (Phase 1)
  { code: 'users:create', module: 'users', description: 'Create users in tenant' },
  { code: 'users:read', module: 'users', description: 'List and view users' },
  { code: 'users:update', module: 'users', description: 'Update users' },
  { code: 'users:delete', module: 'users', description: 'Deactivate or remove users' },
  { code: 'tenants:read', module: 'tenants', description: 'View tenant profile' },
  { code: 'tenants:update', module: 'tenants', description: 'Update tenant settings' },
  { code: 'roles:read', module: 'roles', description: 'List assignable roles' },
  {
    code: 'invitations:create',
    module: 'invitations',
    description: 'Create, resend, and revoke invitations',
  },
  {
    code: 'invitations:read',
    module: 'invitations',
    description: 'List invitations for tenant',
  },
  // Portal
  { code: 'portal:access', module: 'portal', description: 'Access customer portal' },
  // Future modules (pre-seeded for RBAC expansion)
  { code: 'appointments:create', module: 'appointments', description: 'Create appointments' },
  { code: 'appointments:read', module: 'appointments', description: 'View appointments' },
  { code: 'appointments:update', module: 'appointments', description: 'Update appointments' },
  { code: 'appointments:delete', module: 'appointments', description: 'Cancel appointments' },
  { code: 'inventory:read', module: 'inventory', description: 'View inventory' },
  { code: 'inventory:write', module: 'inventory', description: 'Manage inventory' },
  { code: 'campaigns:read', module: 'campaigns', description: 'View campaigns' },
  { code: 'campaigns:write', module: 'campaigns', description: 'Create and edit campaigns' },
  { code: 'campaigns:send', module: 'campaigns', description: 'Send campaigns' },
  { code: 'seo:read', module: 'seo', description: 'View SEO reports' },
  { code: 'seo:run', module: 'seo', description: 'Run SEO scans' },
  { code: 'chat:use', module: 'chat', description: 'Use chatbot / assistant' },
  { code: 'tickets:read', module: 'tickets', description: 'View support tickets' },
  { code: 'tickets:manage', module: 'tickets', description: 'Manage support tickets' },
  { code: 'analytics:read', module: 'analytics', description: 'View analytics' },
];

const rolePermissionMap: Record<RoleName, string[]> = {
  [RoleName.SUPER_ADMIN]: permissions.map((p) => p.code),
  [RoleName.TENANT_ADMIN]: [
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'tenants:read',
    'tenants:update',
    'roles:read',
    'invitations:create',
    'invitations:read',
    'appointments:create',
    'appointments:read',
    'appointments:update',
    'appointments:delete',
    'inventory:read',
    'inventory:write',
    'campaigns:read',
    'campaigns:write',
    'campaigns:send',
    'seo:read',
    'seo:run',
    'chat:use',
    'tickets:read',
    'tickets:manage',
    'analytics:read',
  ],
  [RoleName.DOCTOR]: [
    'users:read',
    'appointments:read',
    'appointments:update',
    'chat:use',
    'tickets:read',
    'portal:access',
  ],
  [RoleName.INVENTORY_MANAGER]: [
    'users:read',
    'inventory:read',
    'inventory:write',
    'chat:use',
    'tickets:read',
  ],
  [RoleName.RECEPTIONIST]: [
    'users:read',
    'appointments:create',
    'appointments:read',
    'appointments:update',
    'chat:use',
    'tickets:read',
  ],
  [RoleName.STAFF]: [
    'users:read',
    'appointments:read',
    'inventory:read',
    'chat:use',
    'tickets:read',
  ],
  [RoleName.CUSTOMER]: ['portal:access', 'appointments:read', 'chat:use'],
};

const roleDescriptions: Record<RoleName, string> = {
  [RoleName.SUPER_ADMIN]: 'NexaAssist platform operator',
  [RoleName.TENANT_ADMIN]: 'Organization owner / administrator',
  [RoleName.DOCTOR]: 'Clinical / provider role',
  [RoleName.INVENTORY_MANAGER]: 'Stock and catalog management',
  [RoleName.RECEPTIONIST]: 'Front-desk scheduling',
  [RoleName.STAFF]: 'General staff access',
  [RoleName.CUSTOMER]: 'End customer / patient portal',
};

async function main(): Promise<void> {
  await prisma.$transaction([
    prisma.rolePermission.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.invitation.deleteMany(),
    prisma.userCodeCounter.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tenant.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.role.deleteMany(),
  ]);

  await prisma.permission.createMany({
    data: permissions,
  });

  const allRoles = Object.values(RoleName);
  await prisma.role.createMany({
    data: allRoles.map((name) => ({
      name,
      description: roleDescriptions[name],
    })),
  });

  const permRows = await prisma.permission.findMany();
  const permByCode = new Map(permRows.map((p) => [p.code, p.id]));
  const roleRows = await prisma.role.findMany();
  const roleByName = new Map(roleRows.map((r) => [r.name, r.id]));

  const rolePermRows: { roleId: string; permissionId: string }[] = [];
  for (const roleName of allRoles) {
    const roleId = roleByName.get(roleName);
    if (!roleId) continue;
    for (const code of rolePermissionMap[roleName]) {
      const permissionId = permByCode.get(code);
      if (!permissionId) continue;
      rolePermRows.push({ roleId, permissionId });
    }
  }

  await prisma.rolePermission.createMany({ data: rolePermRows });

  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (email && password) {
    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
    const passwordHash = await bcrypt.hash(password, rounds);
    const superAdminRoleId = roleByName.get(RoleName.SUPER_ADMIN);
    if (!superAdminRoleId) {
      throw new Error('SUPER_ADMIN role missing after seed');
    }
    await prisma.userCodeCounter.create({
      data: { scopeKey: 'PLATFORM', prefix: 'SA-NEXA', lastSeq: 0 },
    });
    const counter = await prisma.userCodeCounter.update({
      where: { scopeKey_prefix: { scopeKey: 'PLATFORM', prefix: 'SA-NEXA' } },
      data: { lastSeq: { increment: 1 } },
    });
    const seq = String(counter.lastSeq).padStart(3, '0');
    const userCode = `SA-NEXA-${seq}`;
    await prisma.user.create({
      data: {
        userCode,
        email: email.toLowerCase(),
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        status: UserStatus.ACTIVE,
        tenantId: null,
        userRoles: { create: [{ roleId: superAdminRoleId }] },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console -- seed script standalone output
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
