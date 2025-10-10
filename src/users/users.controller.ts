// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { BulkActionDto, BulkActionResultDto } from './dto/bulk-action.dto';
import { UserResponseDto, PaginatedUsersResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { plainToClass } from 'class-transformer';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.PLATFORM_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser: any) {
    // Handle undefined role
    const userRole = createUserDto.role ?? Role.CANDIDATE;
    
    // Org Admin restrictions
    if (currentUser.role === Role.ORG_ADMIN) {
      // Must create users in same organization
      if (createUserDto.tenantId !== currentUser.tenantId) {
        throw new ForbiddenException('Cannot create users outside your organization');
      }
      
      // Cannot create platform admins or candidates
      const forbiddenRoles: Role[] = [Role.PLATFORM_ADMIN, Role.CANDIDATE];
      if (forbiddenRoles.includes(userRole)) {
        throw new ForbiddenException('Cannot create user with this role');
      }

      // Org Admin can only create: ORG_MANAGER, ORG_RECRUITER
      const allowedRoles: Role[] = [Role.ORG_MANAGER, Role.ORG_RECRUITER];
      if (!allowedRoles.includes(userRole)) {
        throw new ForbiddenException('You can only create managers and recruiters');
      }
    }
    
    const user = await this.usersService.create(createUserDto, currentUser);
    return plainToClass(UserResponseDto, user);
  }

  @Get()
  @Roles(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.ORG_MANAGER)
  @ApiOperation({ summary: 'Get paginated users list' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: PaginatedUsersResponseDto })
  async findAllPaginated(
    @Query() query: ListUsersDto,
    @CurrentUser() currentUser: any
  ) {
    const result = await this.usersService.findAllPaginated(query, currentUser);
    
    // Transform response based on role
    result.data = result.data.map(user => {
      const transformed = plainToClass(UserResponseDto, user);
      
      // Limit data for managers and recruiters
      if (currentUser.role === Role.ORG_MANAGER || currentUser.role === Role.ORG_RECRUITER) {
        // Remove sensitive information
        delete (transformed as any).lastLoginAt;
        delete (transformed as any).verified;
      }
      
      return transformed;
    });
    
    return result;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile', type: UserResponseDto })
  async getCurrentUser(@CurrentUser() user: any) {
    const currentUser = await this.usersService.findOne(user.sub);
    return plainToClass(UserResponseDto, currentUser);
  }

  @Get('team')
  @Roles(Role.ORG_MANAGER)
  @ApiOperation({ summary: 'Get team members (Manager only)' })
  @ApiResponse({ status: 200, description: 'Team members retrieved successfully', type: [UserResponseDto] })
  async getTeamMembers(@CurrentUser() currentUser: any) {
    const teamMembers = await this.usersService.findTeamMembers(currentUser.id);
    return teamMembers.map(user => plainToClass(UserResponseDto, user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
    const targetUser = await this.usersService.findOne(id);
    
    // Users can always view their own profile
    if (targetUser.id === currentUser.sub) {
      return plainToClass(UserResponseDto, targetUser);
    }

    // Platform Admin can view anyone
    if (currentUser.role === Role.PLATFORM_ADMIN) {
      return plainToClass(UserResponseDto, targetUser);
    }

    // Org Admin/Manager can view users in their organization
    if ([Role.ORG_ADMIN, Role.ORG_MANAGER].includes(currentUser.role)) {
      if (targetUser.tenantId === currentUser.tenantId) {
        return plainToClass(UserResponseDto, targetUser);
      }
      throw new ForbiddenException('Cannot view users outside your organization');
    }

    // Other roles can only view their own profile
    throw new ForbiddenException('Cannot view this user profile');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    const targetUser = await this.usersService.findOne(id);

    // Users can always update their own profile (except role/tenantId)
    if (targetUser.id === currentUser.sub) {
      // Users cannot change their own role or tenantId
      const { role, tenantId, status, ...allowedUpdates } = updateUserDto;
      const updatedUser = await this.usersService.update(id, allowedUpdates, currentUser);
      return plainToClass(UserResponseDto, updatedUser);
    }

    // Platform Admin can update anyone
    if (currentUser.role === Role.PLATFORM_ADMIN) {
      const updatedUser = await this.usersService.update(id, updateUserDto, currentUser);
      return plainToClass(UserResponseDto, updatedUser);
    }

    // Org Admin can update users in their organization (except other admins)
    if (currentUser.role === Role.ORG_ADMIN) {
      if (targetUser.tenantId !== currentUser.tenantId) {
        throw new ForbiddenException('Cannot update users outside your organization');
      }
      if (targetUser.role === Role.PLATFORM_ADMIN) {
        throw new ForbiddenException('Cannot update platform admin');
      }
      const updatedUser = await this.usersService.update(id, updateUserDto, currentUser);
      return plainToClass(UserResponseDto, updatedUser);
    }

    throw new ForbiddenException('Cannot update this user');
  }

  @Delete(':id')
  @Roles(Role.PLATFORM_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Soft delete user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'User deleted successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
    const targetUser = await this.usersService.findOne(id);
    
    // Org Admin restrictions
    if (currentUser.role === Role.ORG_ADMIN) {
      // Can only delete users in same organization
      if (targetUser.tenantId !== currentUser.tenantId) {
        throw new ForbiddenException('Cannot delete users outside your organization');
      }
      
      // Cannot delete platform admins or candidates
      const protectedRoles: Role[] = [Role.PLATFORM_ADMIN, Role.CANDIDATE];
      if (protectedRoles.includes(targetUser.role)) {
        throw new ForbiddenException('Cannot delete user with this role');
      }
    }
    
    const deletedUser = await this.usersService.softDelete(id, currentUser);
    return plainToClass(UserResponseDto, deletedUser);
  }

  @Post(':id/restore')
  @Roles(Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Restore soft-deleted user' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'User restored successfully', type: UserResponseDto })
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
    const restoredUser = await this.usersService.restore(id, currentUser);
    return plainToClass(UserResponseDto, restoredUser);
  }

  @Delete(':id/hard')
  @Roles(Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Hard delete user (GDPR compliance)' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'User permanently deleted', type: UserResponseDto })
  async hardDelete(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
    const deletedUser = await this.usersService.hardDelete(id, currentUser);
    return plainToClass(UserResponseDto, deletedUser);
  }

  @Post('bulk-action')
  @Roles(Role.PLATFORM_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Perform bulk actions on users' })
  @ApiResponse({ status: 200, description: 'Bulk action completed', type: BulkActionResultDto })
  @HttpCode(HttpStatus.OK)
  async bulkAction(@Body() bulkActionDto: BulkActionDto, @CurrentUser() currentUser: any) {
    // For org admins, validate all users belong to their organization
    if (currentUser.role === Role.ORG_ADMIN) {
      const users = await Promise.all(
        bulkActionDto.userIds.map(id => this.usersService.findOne(id, true))
      );
      
      const invalidUsers = users.filter(user => user.tenantId !== currentUser.tenantId);
      if (invalidUsers.length > 0) {
        throw new ForbiddenException('Cannot perform bulk actions on users outside your organization');
      }
    }

    return this.usersService.bulkAction(bulkActionDto, currentUser);
  }

  @Get(':id/audit')
  @Roles(Role.PLATFORM_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Get user audit trail' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Audit trail retrieved successfully' })
  async getAuditTrail(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
    return this.usersService.getAuditTrail(id, currentUser);
  }

  @Post(':id/impersonate')
  @Roles(Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Generate impersonation token for user' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Impersonation token generated' })
  @HttpCode(HttpStatus.OK)
  async impersonate(@Param('id', ParseIntPipe) id: number, @CurrentUser() currentUser: any) {
    // This would integrate with your auth service to generate an impersonation token
    // For now, just validate the user exists
    const targetUser = await this.usersService.findOne(id);
    
    // Audit log for impersonation
    // await this.auditService.log({...});
    
    return {
      message: 'Impersonation token would be generated here',
      targetUserId: id,
      targetUserEmail: targetUser.email,
    };
  }
}
