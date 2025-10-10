// src/users/users.service.ts
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException,
  ForbiddenException
} from '@nestjs/common';
import { PrismaClient, Prisma, $Enums } from '@prisma/client';
import { hashPassword } from '../common/utils/password.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { BulkActionDto, BulkActionType, BulkActionResultDto } from './dto/bulk-action.dto';
import { PaginatedUsersResponseDto, UserResponseDto } from './dto/user-response.dto';
import { AuditService } from '../common/services/audit.service';

// Use destructured enums for cleaner code
const { Role, UserStatus } = $Enums;

// Define the include structure for type safety
const userWithIncludes = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: {
    profile: true,
    subscription: true,
    organization: {
      select: { id: true, name: true, plan: true },
    },
    userOrgRoles: {
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    },
  },
});

type UserWithProfile = Prisma.UserGetPayload<typeof userWithIncludes>;

@Injectable()
export class UsersService {
  private prisma = new PrismaClient();

  constructor(private readonly auditService: AuditService) {}

  // Helper method to convert Prisma user to DTO format
  private mapUserToResponseDto(user: UserWithProfile): UserResponseDto {
    return {
      ...user,
      tenantId: user.tenantId ?? undefined, // Convert null to undefined for DTO compatibility
    } as UserResponseDto;
  }

  async findAllPaginated(
    query: ListUsersDto,
    currentUser: any
  ): Promise<PaginatedUsersResponseDto> {
    // Provide defaults for potentially undefined values
    const { 
      page = 1, 
      limit = 10, 
      role, 
      status, 
      search, 
      orgId, 
      sortBy = 'createdAt', 
      sortOrder = 'desc', 
      includeDeleted = false 
    } = query;
    
    // Build where clause based on permissions and filters
    const where: Prisma.UserWhereInput = {};
    
    // Soft delete filter (unless explicitly requesting deleted users)
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    // Role-based filtering
    if (currentUser.role !== Role.PLATFORM_ADMIN) {
      // Non-platform admins can only see users in their organization
      where.tenantId = currentUser.tenantId;
      
      // Managers can only see their team members
      if (currentUser.role === Role.ORG_MANAGER) {
        where.role = Role.ORG_RECRUITER;
      }
    } else if (orgId) {
      // Platform admin can filter by specific org
      where.tenantId = orgId;
    }

    // Additional filters
    if (role) where.role = role;
    if (status) where.status = status;
    
    // Search functionality
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { 
          profile: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ]
          }
        }
      ];
    }

    const skip = (page - 1) * limit;
    
    // Fix the index type error with proper typing
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;
    else if (sortBy === 'lastLoginAt') orderBy.lastLoginAt = sortOrder;
    else if (sortBy === 'email') orderBy.email = sortOrder;
    else if (sortBy === 'role') orderBy.role = sortOrder;
    else if (sortBy === 'status') orderBy.status = sortOrder;
    else orderBy.createdAt = sortOrder; // Default fallback

    // Execute queries in parallel
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: userWithIncludes.include,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map(user => this.mapUserToResponseDto(user)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findAll(role?: $Enums.Role): Promise<UserWithProfile[]> {
    return this.prisma.user.findMany({
      where: { 
        role,
        deletedAt: null,
      },
      include: userWithIncludes.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTenant(tenantId: number, role?: $Enums.Role): Promise<UserWithProfile[]> {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(role && { role }),
      },
      include: userWithIncludes.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTeamMembers(managerId: number): Promise<UserWithProfile[]> {
    const manager = await this.findOne(managerId);
    
    return this.prisma.user.findMany({
      where: {
        tenantId: manager.tenantId,
        role: Role.ORG_RECRUITER,
        deletedAt: null,
      },
      include: userWithIncludes.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, includeDeleted = false): Promise<UserWithProfile> {
    const where: Prisma.UserWhereInput = { id };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const user = await this.prisma.user.findFirst({
      where,
      include: userWithIncludes.include,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string, includeDeleted = false): Promise<UserWithProfile | null> {
    const where: Prisma.UserWhereInput = { email };
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return this.prisma.user.findFirst({
      where,
      include: userWithIncludes.include,
    });
  }

  async create(createUserDto: CreateUserDto, currentUser: any): Promise<UserWithProfile> {
    const { 
      email, 
      password, 
      role = Role.CANDIDATE, 
      status = UserStatus.ACTIVE, 
      tenantId, 
      firstName, 
      lastName, 
      phone 
    } = createUserDto;

    // Check if user exists (including soft-deleted users)
    const existingUser = await this.findByEmail(email, true);
    if (existingUser && !existingUser.deletedAt) {
      throw new ConflictException('User with this email already exists');
    }

    // If there's a soft-deleted user with this email, we need to hard delete it first
    if (existingUser && existingUser.deletedAt) {
      await this.prisma.user.delete({
        where: { id: existingUser.id }
      });
    }

    // Validate tenant for org users
    if (role !== Role.CANDIDATE && role !== Role.PLATFORM_ADMIN) {
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required for organization users');
      }

      const tenant = await this.prisma.organization.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new BadRequestException('Invalid tenant ID');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with transaction
    const user = await this.prisma.$transaction(async (prisma) => {
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          status,
          tenantId: role === Role.CANDIDATE ? null : tenantId,
          verified: role !== Role.CANDIDATE, // Org users are auto-verified
        },
        include: userWithIncludes.include,
      });

      // Create default profile
      await prisma.profile.create({
        data: {
          userId: newUser.id,
          firstName: firstName || '',
          lastName: lastName || '',
          phone,
        },
      });

      // Create default subscription for candidates
      if (role === Role.CANDIDATE) {
        await prisma.subscription.create({
          data: {
            userId: newUser.id,
            tier: 'FREE',
          },
        });
      }

      // Add user to organization if specified
      if (tenantId && role !== Role.CANDIDATE) {
        await prisma.userOrgRole.create({
          data: {
            userId: newUser.id,
            orgId: tenantId,
            role: role,
          },
        });
      }

      return newUser;
    });

    // Audit log
    await this.auditService.log({
      userId: currentUser.id,
      action: 'CREATE_USER',
      resource: 'User',
      resourceId: user.id,
      metadata: { 
        createdUserRole: role, 
        createdUserEmail: email,
        tenantId 
      },
    });

    return user;
  }

  async update(id: number, updateData: UpdateUserDto, currentUser: any): Promise<UserWithProfile> {
    const existingUser = await this.findOne(id);
    
    // Prepare update data, excluding undefined values
    const data: any = {}; // Using any to handle tenantId field
    
    if (updateData.role !== undefined) data.role = updateData.role;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.tenantId !== undefined) data.tenantId = updateData.tenantId;

    // Update profile data if provided
    const profileData: any = {};
    if (updateData.firstName !== undefined) profileData.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) profileData.lastName = updateData.lastName;
    if (updateData.phone !== undefined) profileData.phone = updateData.phone;

    if (Object.keys(profileData).length > 0) {
      data.profile = {
        update: profileData
      };
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data,
        include: userWithIncludes.include,
      });

      // Audit log
      await this.auditService.log({
        userId: currentUser.id,
        action: 'UPDATE_USER',
        resource: 'User',
        resourceId: id,
        metadata: { 
          updates: updateData,
          previousRole: existingUser.role,
          newRole: updateData.role
        },
      });

      return updatedUser;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(id: number, currentUser: any): Promise<UserWithProfile> {
    const existingUser = await this.findOne(id);

    try {
      const deletedUser = await this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: currentUser.id,
          status: UserStatus.DELETED,
        },
        include: userWithIncludes.include,
      });

      // Audit log
      await this.auditService.log({
        userId: currentUser.id,
        action: 'SOFT_DELETE_USER',
        resource: 'User',
        resourceId: id,
        metadata: { 
          deletedUserEmail: existingUser.email,
          deletedUserRole: existingUser.role
        },
      });

      return deletedUser;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async restore(id: number, currentUser: any): Promise<UserWithProfile> {
    const existingUser = await this.findOne(id, true);
    
    if (!existingUser.deletedAt) {
      throw new BadRequestException('User is not deleted');
    }

    try {
      const restoredUser = await this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
          status: UserStatus.ACTIVE,
        },
        include: userWithIncludes.include,
      });

      // Audit log
      await this.auditService.log({
        userId: currentUser.id,
        action: 'RESTORE_USER',
        resource: 'User',
        resourceId: id,
        metadata: { 
          restoredUserEmail: existingUser.email,
          restoredUserRole: existingUser.role
        },
      });

      return restoredUser;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async hardDelete(id: number, currentUser: any): Promise<UserWithProfile> {
    const existingUser = await this.findOne(id, true);

    try {
      const deletedUser = await this.prisma.user.delete({
        where: { id },
        include: userWithIncludes.include,
      });

      // Audit log
      await this.auditService.log({
        userId: currentUser.id,
        action: 'HARD_DELETE_USER',
        resource: 'User',
        resourceId: id,
        metadata: { 
          deletedUserEmail: existingUser.email,
          deletedUserRole: existingUser.role
        },
      });

      return deletedUser;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async bulkAction(bulkActionDto: BulkActionDto, currentUser: any): Promise<BulkActionResultDto> {
    const { userIds, action } = bulkActionDto;
    const result: BulkActionResultDto = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        switch (action) {
          case BulkActionType.ACTIVATE:
            await this.update(userId, { status: UserStatus.ACTIVE }, currentUser);
            break;
          case BulkActionType.SUSPEND:
            await this.update(userId, { status: UserStatus.SUSPENDED }, currentUser);
            break;
          case BulkActionType.DELETE:
            await this.softDelete(userId, currentUser);
            break;
          case BulkActionType.RESTORE:
            await this.restore(userId, currentUser);
            break;
        }
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          userId,
          error: error.message || 'Unknown error'
        });
      }
    }

    // Audit log for bulk action
    await this.auditService.log({
      userId: currentUser.id,
      action: `BULK_${action.toUpperCase()}`,
      resource: 'User',
      metadata: { 
        userIds,
        result
      },
    });

    return result;
  }

  async getAuditTrail(userId: number, currentUser: any) {
    // Only platform admins and org admins can view audit trails
    if (currentUser.role !== Role.PLATFORM_ADMIN && currentUser.role !== Role.ORG_ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const user = await this.findOne(userId, true);
    
    // Org admins can only view audit trails for users in their org
    if (currentUser.role === Role.ORG_ADMIN && user.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('Cannot view audit trail for users outside your organization');
    }

    return this.auditService.getAuditTrail('User', userId);
  }

  // Clean up database connection
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
