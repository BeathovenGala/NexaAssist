import { Injectable } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { AuthUser } from '../types/auth-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAssignable(actor: AuthUser) {
    const rows = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: { name: true, description: true },
    });
    if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
      return { items: rows };
    }
    const filtered = rows.filter((r) => r.name !== RoleName.SUPER_ADMIN);
    return { items: filtered };
  }
}
