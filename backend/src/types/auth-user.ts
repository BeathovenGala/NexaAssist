import type { RoleName } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string | null;
  roles: RoleName[];
  permissions: string[];
  userCode: string;
}
