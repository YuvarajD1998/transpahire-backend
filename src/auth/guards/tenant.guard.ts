import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client'; 
import { Role } from '@prisma/client';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma = new PrismaClient()
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Platform admins can access everything
    if (user.role === Role.PLATFORM_ADMIN) {
      return true;
    }

    // For org-related routes, check tenant access
    const tenantId = request.params.tenantId || request.body.tenantId || user.tenantId;

    if (tenantId && user.tenantId !== tenantId) {
      // Check if user has role in this org
      const userOrgRole = await this.prisma.userOrgRole.findFirst({
        where: {
          userId: user.sub,
          orgId: parseInt(tenantId),
        },
      });

      if (!userOrgRole) {
        throw new ForbiddenException('Access denied to this organization');
      }
    }

    return true;
  }
}
