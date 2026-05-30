import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { slugify } from '../common/utils/slug.util';
import { generateRefreshToken, hashToken } from '../common/utils/token.util';
import { PrismaService } from '../prisma/prisma.service';
import { UserCodeService } from '../users/user-code.service';
import { filterDemoPermissions } from './demo-access';
import type { LoginDto, RegisterCustomerDto, RegisterTenantDto } from './dto/auth.dto';
import type { AccessJwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly userCodes: UserCodeService,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const email = dto.adminEmail.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    let baseSlug = slugify(dto.companyName);
    if (!baseSlug) {
      baseSlug = `org-${Date.now()}`;
    }
    let slug = baseSlug;
    let suffix = 0;
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }
    const rounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    const passwordHash = await bcrypt.hash(dto.adminPassword, rounds);
    const refreshTtlDays = Number(
      this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug,
          businessType: dto.businessType,
        },
      });
      const userCode = await this.userCodes.allocateNextCode(
        tx,
        tenant.id,
        tenant.slug,
        RoleName.TENANT_ADMIN,
      );
      const adminRole = await tx.role.findUniqueOrThrow({
        where: { name: RoleName.TENANT_ADMIN },
      });
      const user = await tx.user.create({
        data: {
          userCode,
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          status: UserStatus.ACTIVE,
          userRoles: { create: [{ roleId: adminRole.id }] },
        },
        include: {
          tenant: true,
          userRoles: { include: { role: true } },
        },
      });
      return { tenant, user };
    });

    const tokens = await this.issueTokens(
      result.user.id,
      result.user.email,
      result.user.tenantId,
      refreshTtlDays,
    );

    this.logger.info(
      { tenantId: result.tenant.id, userId: result.user.id },
      'Tenant registered',
    );

    return {
      tenant: this.mapTenant(result.tenant),
      user: this.mapUser(result.user),
      ...tokens,
    };
  }

  async registerCustomer(dto: RegisterCustomerDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const rounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const refreshTtlDays = Number(
      this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const userCode = await this.userCodes.allocateUnaffiliatedCustomerCode(tx);
      const customerRole = await tx.role.findUniqueOrThrow({
        where: { name: RoleName.CUSTOMER },
      });
      const user = await tx.user.create({
        data: {
          userCode,
          tenantId: null,
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName?.trim() || null,
          status: UserStatus.ACTIVE,
          userRoles: { create: [{ roleId: customerRole.id }] },
        },
        include: {
          tenant: true,
          userRoles: { include: { role: true } },
        },
      });
      return { user };
    });

    const tokens = await this.issueTokens(
      result.user.id,
      result.user.email,
      result.user.tenantId,
      refreshTtlDays,
    );

    this.logger.info({ userId: result.user.id }, 'Customer registered (pending tenant)');

    return {
      user: this.mapUser(result.user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      this.logger.warn({ email }, 'Failed login attempt — user not found');
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      this.logger.warn({ email }, 'Failed login attempt — bad password');
      throw new UnauthorizedException('Invalid credentials');
    }
    const refreshTtlDays = Number(
      this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7,
    );
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.tenantId,
      refreshTtlDays,
    );
    this.logger.info(
      { userId: user.id, tenantId: user.tenantId },
      'User logged in',
    );
    return {
      user: this.mapUser(user),
      ...tokens,
    };
  }

  async refresh(refreshTokenRaw: string) {
    const tokenHash = hashToken(refreshTokenRaw);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !record ||
      record.revokedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      this.logger.warn({ tokenHash: tokenHash.slice(0, 8) }, 'Invalid refresh');
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (record.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const refreshTtlDays = Number(
      this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7,
    );

    const accessPayload: AccessJwtPayload = {
      sub: record.user.id,
      email: record.user.email,
      tenantId: record.user.tenantId,
    };
    const accessToken = await this.jwt.signAsync(accessPayload);
    const refreshRaw = generateRefreshToken();
    const refreshHash = hashToken(refreshRaw);
    const expiresAt = new Date(
      Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: record.user.id,
          tokenHash: refreshHash,
          expiresAt,
        },
      }),
    ]);

    this.logger.info({ userId: record.user.id }, 'Refresh token rotated');
    return { accessToken, refreshToken: refreshRaw };
  }

  async logout(refreshTokenRaw: string) {
    const tokenHash = hashToken(refreshTokenRaw);
    const updated = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count > 0) {
      this.logger.info({ tokenHash: tokenHash.slice(0, 8) }, 'User logged out');
    }
    return { revoked: updated.count };
  }

  /** Used after invite acceptance — issues tokens without password verification. */
  async createSessionForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not available');
    }
    const refreshTtlDays = Number(
      this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7,
    );
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.tenantId,
      refreshTtlDays,
    );
    return {
      user: this.mapUser(user),
      ...tokens,
    };
  }

  /** Creates a session for the configured demo admin user when demo seeding is enabled. */
  async demoLogin() {
    const demoEmail =
      this.config.get('SEED_DEMO_ADMIN_EMAIL')?.trim()?.toLowerCase() ||
      'tenantadmin.demo@seed.local';
    const user = await this.ensureDemoUser(demoEmail);
    return this.createSessionForUser(user.id);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];
    return {
      user: {
        ...this.mapUser(user),
        permissions: filterDemoPermissions(permissions, user.email),
      },
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    tenantId: string | null,
    refreshTtlDays: number,
  ) {
    const payload: AccessJwtPayload = {
      sub: userId,
      email,
      tenantId,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshRaw = generateRefreshToken();
    const refreshHash = hashToken(refreshRaw);
    const expiresAt = new Date(
      Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshHash,
        expiresAt,
      },
    });
    return { accessToken, refreshToken: refreshRaw };
  }

  private async ensureDemoUser(email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true,
        userRoles: { include: { role: true } },
      },
    });
    if (existing && existing.status === UserStatus.ACTIVE) {
      return existing;
    }

    const tenantName = this.config.get('SEED_DEMO_TENANT_NAME')?.trim() || 'Demo Medical Group';
    const tenantSlug = this.config.get('SEED_DEMO_TENANT_SLUG')?.trim() || 'demo-medical-group';
    const passwordSeed = this.config.get('SEED_DEMO_PASSWORD')?.trim() || 'demo-access-only';
    const rounds = Number(this.config.get('BCRYPT_ROUNDS') ?? 12);
    const passwordHash = await bcrypt.hash(passwordSeed, rounds);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { slug: tenantSlug },
        create: {
          name: tenantName,
          slug: tenantSlug,
          businessType: 'Healthcare',
        },
        update: {
          name: tenantName,
        },
      });

      const role = await tx.role.findUniqueOrThrow({
        where: { name: RoleName.TENANT_ADMIN },
      });
      const userCode = await this.userCodes.allocateNextCode(
        tx,
        tenant.id,
        tenant.slug,
        RoleName.TENANT_ADMIN,
      );

      return tx.user.upsert({
        where: { email },
        create: {
          userCode,
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: 'Demo',
          lastName: 'Admin',
          status: UserStatus.ACTIVE,
          userRoles: { create: [{ roleId: role.id }] },
        },
        update: {
          tenantId: tenant.id,
          passwordHash,
          status: UserStatus.ACTIVE,
          userRoles: {
            deleteMany: {},
            create: [{ roleId: role.id }],
          },
        },
        include: {
          tenant: true,
          userRoles: { include: { role: true } },
        },
      });
    });
  }

  private mapTenant(tenant: { id: string; name: string; slug: string; businessType: string | null; status: string }) {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      businessType: tenant.businessType,
      status: tenant.status,
    };
  }

  private mapUser(
    user: {
      id: string;
      userCode: string;
      email: string;
      firstName: string;
      lastName: string | null;
      phone: string | null;
      tenantId: string | null;
      tenant?: { id: string; name: string; slug: string } | null;
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
      tenant: user.tenant
        ? { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug }
        : null,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
