import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JoinRequestStatus, RoleName } from '@prisma/client';
import type { AuthUser } from '../types/auth-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JoinRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveListTenantId(
    actor: AuthUser,
    tenantIdQuery?: string,
  ): string | null {
    if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
      const tid = tenantIdQuery ?? actor.tenantId;
      return tid ?? null;
    }
    if (!actor.tenantId) {
      throw new BadRequestException('No tenant context for this user');
    }
    if (tenantIdQuery && tenantIdQuery !== actor.tenantId) {
      throw new ForbiddenException('Tenant scope violation');
    }
    return actor.tenantId;
  }

  async create(actor: AuthUser, tenantSlug: string) {
    if (!actor.roles.includes(RoleName.CUSTOMER)) {
      throw new ForbiddenException('Only customers can request to join an organization');
    }
    if (actor.tenantId) {
      throw new BadRequestException('You already belong to an organization');
    }
    const slug = tenantSlug.trim().toLowerCase();
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (!tenant) {
      throw new NotFoundException('Organization not found');
    }
    const pending = await this.prisma.tenantJoinRequest.findFirst({
      where: {
        tenantId: tenant.id,
        userId: actor.id,
        status: JoinRequestStatus.PENDING,
      },
    });
    if (pending) {
      throw new ConflictException('You already have a pending request for this organization');
    }
    const row = await this.prisma.tenantJoinRequest.create({
      data: {
        tenantId: tenant.id,
        userId: actor.id,
        status: JoinRequestStatus.PENDING,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userCode: true,
          },
        },
      },
    });
    return this.mapRow(row);
  }

  async list(
    actor: AuthUser,
    tenantIdQuery?: string,
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    const tenantId = this.resolveListTenantId(actor, tenantIdQuery);
    if (!tenantId) {
      return [];
    }
    const rows = await this.prisma.tenantJoinRequest.findMany({
      where: {
        tenantId,
        ...(status ? { status: status as JoinRequestStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userCode: true,
          },
        },
      },
      take: 200,
    });
    return rows.map((r) => this.mapRow(r));
  }

  async pendingCount(actor: AuthUser, tenantIdQuery?: string) {
    const tenantId = this.resolveListTenantId(actor, tenantIdQuery);
    if (!tenantId) {
      return { count: 0 };
    }
    const count = await this.prisma.tenantJoinRequest.count({
      where: { tenantId, status: JoinRequestStatus.PENDING },
    });
    return { count };
  }

  async approve(actor: AuthUser, id: string) {
    const row = await this.prisma.tenantJoinRequest.findUnique({
      where: { id },
      include: { user: true, tenant: true },
    });
    if (!row) {
      throw new NotFoundException('Join request not found');
    }
    this.assertCanManageTenant(actor, row.tenantId);
    if (row.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }
    if (row.user.tenantId) {
      throw new ConflictException('User already belongs to an organization');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { tenantId: row.tenantId },
      }),
      this.prisma.tenantJoinRequest.update({
        where: { id },
        data: { status: JoinRequestStatus.APPROVED },
      }),
    ]);
    const updated = await this.prisma.tenantJoinRequest.findUniqueOrThrow({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userCode: true,
            tenantId: true,
          },
        },
      },
    });
    return this.mapRow(updated);
  }

  async reject(actor: AuthUser, id: string) {
    const row = await this.prisma.tenantJoinRequest.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException('Join request not found');
    }
    this.assertCanManageTenant(actor, row.tenantId);
    if (row.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }
    const updated = await this.prisma.tenantJoinRequest.update({
      where: { id },
      data: { status: JoinRequestStatus.REJECTED },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userCode: true,
          },
        },
      },
    });
    return this.mapRow(updated);
  }

  private assertCanManageTenant(actor: AuthUser, tenantId: string): void {
    if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
      return;
    }
    if (!actor.tenantId || actor.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant scope violation');
    }
  }

  private mapRow(row: {
    id: string;
    tenantId: string;
    userId: string;
    status: JoinRequestStatus;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    tenant: { id: string; name: string; slug: string };
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      userCode: string;
      tenantId?: string | null;
    };
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      status: row.status,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      tenant: row.tenant,
      user: {
        id: row.user.id,
        email: row.user.email,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        userCode: row.user.userCode,
        ...(row.user.tenantId !== undefined
          ? { tenantId: row.user.tenantId }
          : {}),
      },
    };
  }
}
