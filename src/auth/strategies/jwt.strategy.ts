import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client'; 

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  tenantId?: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private prisma = new PrismaClient(); // Direct instantiation

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    const { sub, email, role, tenantId } = payload;

    // Verify user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        verified: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, plan: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.verified) {
      throw new UnauthorizedException('User not verified');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      organization: user.organization,
    };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
