import { RoleName } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { formatTenantSlugPart } from '../common/utils/slug.util';

const ROLE_CODE_PREFIX: Record<RoleName, string> = {
  [RoleName.SUPER_ADMIN]: 'SA-NEXA',
  [RoleName.TENANT_ADMIN]: 'TA',
  [RoleName.DOCTOR]: 'DR',
  [RoleName.INVENTORY_MANAGER]: 'IM',
  [RoleName.RECEPTIONIST]: 'RC',
  [RoleName.STAFF]: 'ST',
  [RoleName.CUSTOMER]: 'CU',
};

@Injectable()
export class UserCodeService {
  async allocateNextCode(
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
}
