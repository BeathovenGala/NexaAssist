import { Prisma, RoleName, UserStatus } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { formatTenantSlugPart, slugify } from '../src/common/utils/slug.util';

const ROLE_CODE_PREFIX: Record<RoleName, string> = {
  [RoleName.SUPER_ADMIN]: 'SA-NEXA',
  [RoleName.TENANT_ADMIN]: 'TA',
  [RoleName.DOCTOR]: 'DR',
  [RoleName.INVENTORY_MANAGER]: 'IM',
  [RoleName.RECEPTIONIST]: 'RC',
  [RoleName.STAFF]: 'ST',
  [RoleName.CUSTOMER]: 'CU',
  [RoleName.CHATBOT_EXEC]: 'EX',
};

async function allocateTenantUserCode(
  tx: Prisma.TransactionClient,
  tenantId: string,
  tenantSlug: string,
  roleName: RoleName,
): Promise<string> {
  if (roleName === RoleName.SUPER_ADMIN) {
    throw new Error('Super admin codes are provisioned via seed only');
  }
  const prefix = ROLE_CODE_PREFIX[roleName];
  const scopeKey = tenantSlug.toLowerCase();
  const slugPart = formatTenantSlugPart(tenantSlug);
  const counter = await tx.userCodeCounter.upsert({
    where: {
      scopeKey_prefix: { scopeKey, prefix },
    },
    create: {
      scopeKey,
      prefix,
      lastSeq: 1,
      tenantId,
    },
    update: { lastSeq: { increment: 1 } },
  });
  const seq = String(counter.lastSeq).padStart(3, '0');
  return `${prefix}-${slugPart}-${seq}`;
}

async function allocateUnaffiliatedCustomerCode(tx: Prisma.TransactionClient): Promise<string> {
  const scopeKey = 'GLOBAL';
  const prefix = 'CU';
  const slugPart = 'INV';
  const counter = await tx.userCodeCounter.upsert({
    where: {
      scopeKey_prefix: { scopeKey, prefix },
    },
    create: {
      scopeKey,
      prefix,
      lastSeq: 1,
      tenantId: null,
    },
    update: { lastSeq: { increment: 1 } },
  });
  const seq = String(counter.lastSeq).padStart(3, '0');
  return `${prefix}-${slugPart}-${seq}`;
}

type DemoUserRow = {
  email: string;
  firstName: string;
  lastName: string | null;
  role: RoleName;
  /** null = unaffiliated customer (no tenant yet) */
  tenantMode: 'tenant' | 'unaffiliated';
};

/**
 * Optional QA personas: one tenant plus users covering each RoleName (and an unaffiliated customer).
 * Enable with SEED_DEMO_USERS=true and SEED_DEMO_PASSWORD set in backend/.env, then `npm run db:seed`.
 */
export async function seedDemoPersonas(
  prisma: PrismaClient,
  roleByName: Map<RoleName, string>,
  bcryptRounds: number,
): Promise<void> {
  if (process.env.SEED_DEMO_USERS !== 'true') {
    return;
  }

  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password?.trim()) {
    throw new Error('SEED_DEMO_USERS=true requires SEED_DEMO_PASSWORD (local QA only).');
  }

  const tenantName = process.env.SEED_DEMO_TENANT_NAME?.trim() || 'Demo Medical Group';
  const adminEmail =
    process.env.SEED_DEMO_ADMIN_EMAIL?.trim()?.toLowerCase() || 'tenantadmin.demo@seed.local';
  const doctorEmail =
    process.env.SEED_DEMO_DOCTOR_EMAIL?.trim()?.toLowerCase() || 'dr.rivera.demo@seed.local';
  const inventoryEmail =
    process.env.SEED_DEMO_INVENTORY_EMAIL?.trim()?.toLowerCase() || 'im.chen.demo@seed.local';
  const receptionEmail =
    process.env.SEED_DEMO_RECEPTION_EMAIL?.trim()?.toLowerCase() || 'rc.morgan.demo@seed.local';
  const staffEmail =
    process.env.SEED_DEMO_STAFF_EMAIL?.trim()?.toLowerCase() || 'st.jordan.demo@seed.local';
  const customerTenantEmail =
    process.env.SEED_DEMO_CUSTOMER_TENANT_EMAIL?.trim()?.toLowerCase() ||
    'patient.lee.demo@seed.local';
  const customerSoloEmail =
    process.env.SEED_DEMO_CUSTOMER_SOLO_EMAIL?.trim()?.toLowerCase() ||
    'customer.unaffiliated@seed.local';
  const execEmail =
    process.env.SEED_DEMO_EXEC_EMAIL?.trim()?.toLowerCase() ||
    'exec.support.demo@seed.local';

  const passwordHash = await bcrypt.hash(password, bcryptRounds);

  const rows: DemoUserRow[] = [
    {
      email: adminEmail,
      firstName: 'Dana',
      lastName: 'Admin',
      role: RoleName.TENANT_ADMIN,
      tenantMode: 'tenant',
    },
    {
      email: doctorEmail,
      firstName: 'Alex',
      lastName: 'Rivera',
      role: RoleName.DOCTOR,
      tenantMode: 'tenant',
    },
    {
      email: inventoryEmail,
      firstName: 'Morgan',
      lastName: 'Chen',
      role: RoleName.INVENTORY_MANAGER,
      tenantMode: 'tenant',
    },
    {
      email: receptionEmail,
      firstName: 'Riley',
      lastName: 'Morgan',
      role: RoleName.RECEPTIONIST,
      tenantMode: 'tenant',
    },
    {
      email: staffEmail,
      firstName: 'Jordan',
      lastName: 'Lee',
      role: RoleName.STAFF,
      tenantMode: 'tenant',
    },
    {
      email: customerTenantEmail,
      firstName: 'Pat',
      lastName: 'Lee',
      role: RoleName.CUSTOMER,
      tenantMode: 'tenant',
    },
    {
      email: execEmail,
      firstName: 'Eva',
      lastName: 'Support',
      role: RoleName.CHATBOT_EXEC,
      tenantMode: 'tenant',
    },
    {
      email: customerSoloEmail,
      firstName: 'Sam',
      lastName: 'Solo',
      role: RoleName.CUSTOMER,
      tenantMode: 'unaffiliated',
    },
  ];

  await prisma.$transaction(async (tx) => {
    let baseSlug = slugify(tenantName);
    if (!baseSlug) {
      baseSlug = `org-seed-${Date.now()}`;
    }
    let slug = baseSlug;
    let suffix = 0;
    while (await tx.tenant.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const businessType =
      process.env.SEED_DEMO_TENANT_BUSINESS_TYPE?.trim() || 'Healthcare';

    const tenant = await tx.tenant.create({
      data: {
        name: tenantName,
        slug,
        businessType,
      },
    });

    for (const row of rows) {
      const roleId = roleByName.get(row.role);
      if (!roleId) {
        throw new Error(`Missing role ${row.role} while seeding demo personas`);
      }

      const tenantId = row.tenantMode === 'tenant' ? tenant.id : null;
      let userCode: string;
      if (row.tenantMode === 'tenant') {
        userCode = await allocateTenantUserCode(tx, tenant.id, tenant.slug, row.role);
      } else {
        userCode = await allocateUnaffiliatedCustomerCode(tx);
      }

      await tx.user.create({
        data: {
          userCode,
          email: row.email.toLowerCase(),
          passwordHash,
          firstName: row.firstName,
          lastName: row.lastName,
          tenantId,
          status: UserStatus.ACTIVE,
          userRoles: { create: [{ roleId }] },
        },
      });
    }
  });
}
