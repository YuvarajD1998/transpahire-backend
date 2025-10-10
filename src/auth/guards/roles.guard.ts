import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client'; 
import { Role } from '../../common/enums/role.enum'; 
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private prisma = new PrismaClient(); // Direct instantiation

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Platform admin can access everything
    if (user.role === Role.PLATFORM_ADMIN) {
      return true;
    }

    // Check if user has the required role
    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      // For org users, check if they have org-level roles
      if (user.tenantId) {
        const userOrgRoles = await this.prisma.userOrgRole.findMany({
          where: {
            userId: user.sub,
            orgId: user.tenantId,
          },
        });

        const hasOrgRole = userOrgRoles.some(orgRole => 
          requiredRoles.includes(orgRole.role as Role)
        );

        if (!hasOrgRole) {
          throw new ForbiddenException('Insufficient permissions');
        }
      } else {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }

  // Clean up database connection
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
