import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteStatus, RoleName, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuthService } from '../auth/auth.service';
import {
  generateInvitationToken,
  hashToken,
} from '../common/utils/token.util';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { UserCodeService } from '../users/user-code.service';
import type { AcceptInvitationDto, CreateInvitationDto } from './dto/invitations.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly userCodes: UserCodeService,
    private readonly auth: AuthService,
    @InjectPinoLogger(InvitationsService.name)
    private readonly logger: PinoLogger,
  ) {}

  private resolveTenantId(
    actor: AuthUser,
    dtoTenantId?: string,
  ): string | null {
    if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
      return dtoTenantId ?? actor.tenantId;
    }
    return actor.tenantId;
  }

  private assertCanInviteRole(
    actor: AuthUser,
    targetTenantId: string,
    role: RoleName,
  ): void {
    if (role === RoleName.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot invite super admin');
    }
    if (role === RoleName.TENANT_ADMIN) {
      if (!actor.roles.includes(RoleName.SUPER_ADMIN)) {
        throw new ForbiddenException(
          'Only platform admin can invite tenant admin',
        );
      }
      return;
    }
    const isPlatform = actor.roles.includes(RoleName.SUPER_ADMIN);
    const isTenantAdmin =
      actor.roles.includes(RoleName.TENANT_ADMIN) &&
      actor.tenantId === targetTenantId;
    if (!isPlatform && !isTenantAdmin) {
      throw new ForbiddenException('Not allowed to invite for this tenant');
    }
  }

  private inviteTtlMs(): number {
    const days = Number(this.config.get('INVITE_TOKEN_TTL_DAYS') ?? 7);
    return days * 24 * 60 * 60 * 1000;
  }

  private frontendOrigin(): string {
    return (
      this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000'
    );
  }

  async create(actor: AuthUser, dto: CreateInvitationDto) {
    const emailTrim = dto.email?.trim().toLowerCase();
    const phoneTrim = dto.phone?.trim();
    if (!emailTrim && !phoneTrim) {
      throw new BadRequestException('Provide email or phone for the invite');
    }

    const tenantId = this.resolveTenantId(actor, dto.tenantId);
    if (!tenantId) {
      throw new BadRequestException('tenantId is required for this operation');
    }

    this.assertCanInviteRole(actor, tenantId, dto.role);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const roleRow = await this.prisma.role.findUniqueOrThrow({
      where: { name: dto.role },
    });

    if (emailTrim) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: emailTrim },
      });
      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const rawToken = generateInvitationToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.inviteTtlMs());

    const invitation = await this.prisma.invitation.create({
      data: {
        tenantId,
        email: emailTrim ?? null,
        phone: phoneTrim ?? null,
        roleId: roleRow.id,
        tokenHash,
        expiresAt,
        createdById: actor.id,
        status: InviteStatus.PENDING,
      },
      include: { role: true, tenant: true },
    });

    const inviteUrl = `${this.frontendOrigin().replace(/\/$/, '')}/invite/${rawToken}`;

    this.logger.info(
      { invitationId: invitation.id, tenantId, role: dto.role },
      'Invitation created',
    );

    return {
      invitation: {
        id: invitation.id,
        tenantId: invitation.tenantId,
        email: invitation.email,
        phone: invitation.phone,
        role: invitation.role.name,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      inviteUrl,
      token: rawToken,
    };
  }

  async list(actor: AuthUser, tenantIdQuery?: string) {
    const tenantId = this.resolveTenantId(actor, tenantIdQuery);
    if (!tenantId) {
      throw new BadRequestException('tenantId is required for this operation');
    }
    if (!actor.roles.includes(RoleName.SUPER_ADMIN)) {
      if (actor.tenantId !== tenantId) {
        throw new ForbiddenException('Tenant scope violation');
      }
    }

    const rows = await this.prisma.invitation.findMany({
      where: { tenantId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return rows.map((inv) => ({
      id: inv.id,
      tenantId: inv.tenantId,
      email: inv.email,
      phone: inv.phone,
      role: inv.role.name,
      status: inv.status,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      createdAt: inv.createdAt,
    }));
  }

  async validateToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const inv = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { tenant: true, role: true },
    });
    if (!inv) {
      throw new NotFoundException('Invalid or expired invite');
    }
    if (inv.status === InviteStatus.REVOKED) {
      throw new GoneException('This invitation was revoked');
    }
    if (inv.status === InviteStatus.ACCEPTED) {
      throw new GoneException('This invitation was already used');
    }
    if (inv.expiresAt.getTime() < Date.now()) {
      await this.prisma.invitation.updateMany({
        where: { id: inv.id, status: InviteStatus.PENDING },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new GoneException('This invitation has expired');
    }

    return {
      tenantName: inv.tenant.name,
      tenantSlug: inv.tenant.slug,
      role: inv.role.name,
      email: inv.email,
      phone: inv.phone,
      expiresAt: inv.expiresAt,
    };
  }

  async accept(dto: AcceptInvitationDto) {
    const tokenHash = hashToken(dto.token);
    const inv = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { tenant: true, role: true },
    });
    if (!inv) {
      throw new NotFoundException('Invalid or expired invite');
    }
    if (inv.status !== InviteStatus.PENDING) {
      throw new GoneException('This invitation is no longer valid');
    }
    if (inv.expiresAt.getTime() < Date.now()) {
      await this.prisma.invitation.update({
        where: { id: inv.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new GoneException('This invitation has expired');
    }

    const finalEmail = (inv.email ?? dto.email)?.trim().toLowerCase();
    if (!finalEmail) {
      throw new BadRequestException('Email is required to complete signup');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: finalEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const rounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.$transaction(async (tx) => {
      const userCode = await this.userCodes.allocateNextCode(
        tx,
        inv.tenantId,
        inv.tenant.slug,
        inv.role.name,
      );
      const created = await tx.user.create({
        data: {
          userCode,
          tenantId: inv.tenantId,
          email: finalEmail,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName ?? null,
          phone: inv.phone ?? null,
          status: UserStatus.ACTIVE,
          userRoles: { create: [{ roleId: inv.roleId }] },
        },
        include: {
          tenant: true,
          userRoles: { include: { role: true } },
        },
      });
      await tx.invitation.update({
        where: { id: inv.id },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });
      return created;
    });

    this.logger.info(
      { userId: user.id, tenantId: inv.tenantId, invitationId: inv.id },
      'Invitation accepted',
    );

    const session = await this.auth.createSessionForUser(user.id);
    return session;
  }

  async resend(actor: AuthUser, invitationId: string) {
    const inv = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { tenant: true, role: true },
    });
    if (!inv) {
      throw new NotFoundException('Invitation not found');
    }
    this.assertTenantAccess(actor, inv.tenantId);
    if (inv.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be resent');
    }

    const rawToken = generateInvitationToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.inviteTtlMs());

    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { tokenHash, expiresAt },
    });

    const inviteUrl = `${this.frontendOrigin().replace(/\/$/, '')}/invite/${rawToken}`;

    this.logger.info({ invitationId }, 'Invitation resent with new token');

    return {
      invitation: {
        id: inv.id,
        expiresAt,
        role: inv.role.name,
      },
      inviteUrl,
      token: rawToken,
    };
  }

  async revoke(actor: AuthUser, invitationId: string) {
    const inv = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!inv) {
      throw new NotFoundException('Invitation not found');
    }
    this.assertTenantAccess(actor, inv.tenantId);
    if (inv.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InviteStatus.REVOKED },
    });
    this.logger.info({ invitationId }, 'Invitation revoked');
    return { revoked: true };
  }

  private assertTenantAccess(actor: AuthUser, invitationTenantId: string) {
    if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
      return;
    }
    if (!actor.tenantId || actor.tenantId !== invitationTenantId) {
      throw new ForbiddenException('Tenant scope violation');
    }
  }
}
