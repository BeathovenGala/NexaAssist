import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { AuthUser } from '../types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { UserCodeService } from './user-code.service';
import type { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly userCodes: UserCodeService,
    @InjectPinoLogger(UsersService.name) private readonly logger: PinoLogger,
  ) {}

  async create(actor: AuthUser, dto: CreateUserDto) {
    const targetTenantId = this.resolveTargetTenantId(actor, dto.tenantId);
    if (!targetTenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: targetTenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    this.assertCanAssignRole(actor, targetTenantId, dto.role);

    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const rounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const roleRow = await this.prisma.role.findUniqueOrThrow({
      where: { name: dto.role },
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const userCode = await this.userCodes.allocateNextCode(
        tx,
        tenant.id,
        tenant.slug,
        dto.role,
      );
      return tx.user.create({
        data: {
          userCode,
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          status: UserStatus.ACTIVE,
          userRoles: { create: [{ roleId: roleRow.id }] },
        },
        include: {
          userRoles: { include: { role: true } },
        },
      });
    });

    this.logger.info(
      { actorId: actor.id, createdUserId: user.id, tenantId: tenant.id },
      'User created',
    );

    return this.toPublic(user);
  }

  async list(actor: AuthUser, tenantIdQuery?: string) {
    if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
      if (!tenantIdQuery) {
        throw new BadRequestException('tenantId query is required for platform admin');
      }
      const users = await this.prisma.user.findMany({
        where: { tenantId: tenantIdQuery },
        include: { userRoles: { include: { role: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return users.map((u) => this.toPublic(u));
    }
    if (!actor.tenantId) {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: { tenantId: actor.tenantId },
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toPublic(u));
  }

  async update(actor: AuthUser, userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.assertSameTenant(actor, user.tenantId);
    const data: { firstName?: string; lastName?: string | null; phone?: string | null } =
      {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { userRoles: { include: { role: true } } },
    });
    this.logger.info(
      { actorId: actor.id, userId },
      'User updated',
    );
    return this.toPublic(updated);
  }

  private resolveTargetTenantId(
    actor: AuthUser,
    dtoTenantId?: string,
  ): string | null {
    if (actor.roles.includes(RoleName.SUPER_ADMIN) && dtoTenantId) {
      return dtoTenantId;
    }
    return actor.tenantId;
  }

  private assertSameTenant(actor: AuthUser, userTenantId: string | null) {
    if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
      return;
    }
    if (!actor.tenantId || actor.tenantId !== userTenantId) {
      throw new ForbiddenException('Tenant scope violation');
    }
  }

  private assertCanAssignRole(
    actor: AuthUser,
    targetTenantId: string,
    role: RoleName,
  ) {
    if (role === RoleName.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot assign super admin role via API');
    }
    if (role === RoleName.TENANT_ADMIN) {
      if (!actor.roles.includes(RoleName.SUPER_ADMIN)) {
        throw new ForbiddenException('Only platform admin can assign tenant admin');
      }
      return;
    }
    const isPlatform = actor.roles.includes(RoleName.SUPER_ADMIN);
    const isTenantAdmin =
      actor.roles.includes(RoleName.TENANT_ADMIN) &&
      actor.tenantId === targetTenantId;
    if (!isPlatform && !isTenantAdmin) {
      throw new ForbiddenException('Not allowed to create users for this tenant');
    }
  }

  private toPublic(
    user: {
      id: string;
      userCode: string;
      email: string;
      firstName: string;
      lastName: string | null;
      phone: string | null;
      tenantId: string | null;
      userRoles: { role: { name: RoleName } }[];
    },
  ) {
    return {
      id: user.id,
      userCode: user.userCode,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      tenantId: user.tenantId,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
