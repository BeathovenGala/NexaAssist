import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccessJwtPayload {
  sub: string;
  email: string;
  tenantId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessJwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
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
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid session');
    }
    if (user.email !== payload.email) {
      throw new UnauthorizedException('Invalid session');
    }
    const payloadTenant = payload.tenantId ?? null;
    const userTenant = user.tenantId ?? null;
    if (payloadTenant !== userTenant) {
      throw new UnauthorizedException('Invalid session');
    }
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles,
      permissions,
      userCode: user.userCode,
    };
  }
}
