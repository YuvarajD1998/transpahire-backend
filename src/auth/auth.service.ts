// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client'; 
import { UsersService } from '../users/users.service';
import { QueuesService } from '../queues/queues.service';
import { RegisterDto } from './dto/register.dto';
import { OrganizationRegisterDto } from './dto/organization-register.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { Role } from '../common/enums/role.enum'; 
import * as crypto from 'crypto';
import { getJwtConfig, JwtConfig } from '../config/jwt.config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private prisma = new PrismaClient(); 
  private jwtConfig: JwtConfig;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private queuesService: QueuesService,
  ) {
    this.jwtConfig = getJwtConfig(configService);
  }

  private get MAX_SESSION_DAYS() { 
    return this.jwtConfig.maxSessionDays; 
  }
  
  private get REFRESH_TOKEN_DAYS() { 
    return this.jwtConfig.refreshTokenDays; 
  }

  async register(registerDto: RegisterDto) {
    const { email, password, role = Role.CANDIDATE, firstName, lastName } = registerDto;

    // Validate that only CANDIDATE and RECRUITER roles are allowed
    if (role && ![Role.CANDIDATE, Role.RECRUITER].includes(role)) {
      throw new BadRequestException(
        'Organization roles are not allowed. Please use the organization registration endpoint for organization users.'
      );
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user with transaction
    const user = await this.prisma.$transaction(async (prisma) => {
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          tenantId: null, // Individual users don't have tenantId
          emailVerificationToken,
          lastLoginAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          verified: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      // Create default profile for all users (candidates and individual recruiters)
      await prisma.profile.create({
        data: {
          userId: newUser.id,
          firstName: firstName || '',
          lastName: lastName || '',
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

      return newUser;
    });

    // Send verification email
    await this.queuesService.addEmailJob(
      user.email,
      'Verify your email',
      'email-verification',
      {
        name: firstName || user.email,
        verificationToken: emailVerificationToken,
        verificationUrl: `${this.configService.get('FRONTEND_URL')}/verify-email/${emailVerificationToken}`,
      }
    );

    // Log audit event
    await this.logAuditEvent(user.id, 'REGISTER', 'USER', user.id);

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const originalLoginTime = user.lastLoginAt || new Date();

    return {
      user,
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.generateRefreshToken(user.id, originalLoginTime),
    };
  }

  async registerOrganization(organizationRegisterDto: OrganizationRegisterDto) {
    const {
      organizationName,
      organizationPlan = 'ORG_BASIC',
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
    } = organizationRegisterDto;

    // Check if admin user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if organization name already exists (optional validation)
    const existingOrg = await this.prisma.organization.findFirst({
      where: { name: organizationName },
    });

    if (existingOrg) {
      throw new ConflictException('Organization with this name already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(adminPassword);
    
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create organization and admin user with transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create organization first
      const organization = await prisma.organization.create({
        data: {
          name: organizationName,
          plan: organizationPlan,
          verified: false, // Will be verified later
        },
        select: {
          id: true,
          name: true,
          plan: true,
          verified: true,
          createdAt: true,
        },
      });

      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: Role.ORG_ADMIN,
          tenantId: organization.id,
          emailVerificationToken,
          lastLoginAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          verified: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      // Create profile for admin user
      await prisma.profile.create({
        data: {
          userId: adminUser.id,
          firstName: adminFirstName || '',
          lastName: adminLastName || '',
        },
      });

      // Add admin user to organization roles
      await prisma.userOrgRole.create({
        data: {
          userId: adminUser.id,
          orgId: organization.id,
          role: Role.ORG_ADMIN,
        },
      });

      // Create organization subscription
      await prisma.orgSubscription.create({
        data: {
          orgId: organization.id,
          plan: organizationPlan,
          status: 'active',
        },
      });

      return { organization, adminUser };
    });

    // Send verification email to admin
    await this.queuesService.addEmailJob(
      result.adminUser.email,
      'Verify your organization admin account',
      'org-admin-verification',
      {
        name: adminFirstName || result.adminUser.email,
        organizationName,
        verificationToken: emailVerificationToken,
        verificationUrl: `${this.configService.get('FRONTEND_URL')}/verify-email/${emailVerificationToken}`,
      }
    );

    // Log audit events
    await this.logAuditEvent(result.adminUser.id, 'ORGANIZATION_REGISTER', 'ORGANIZATION', result.organization.id);
    await this.logAuditEvent(result.adminUser.id, 'ADMIN_REGISTER', 'USER', result.adminUser.id);

    // Generate JWT token for admin user
    const payload = {
      sub: result.adminUser.id,
      email: result.adminUser.email,
      role: result.adminUser.role,
      tenantId: result.adminUser.tenantId,
    };

    const originalLoginTime = result.adminUser.lastLoginAt || new Date();

    return {
      organization: result.organization,
      user: result.adminUser,
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.generateRefreshToken(result.adminUser.id, originalLoginTime),
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);
    if (!user) {
      this.logger.warn(`Failed login attempt: Invalid credentials for email ${email}`);
      throw new UnauthorizedException('Invalid credentials');

    }

    if (!user.verified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    // Get user with tenant info
    const userWithTenant = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        organization: {
          select: { id: true, name: true, plan: true },
        },
        userOrgRoles: {
          include: {
            organization: {
              select: { id: true, name: true, plan: true },
            },
          },
        },
        subscription: {
          select: { tier: true, status: true },
        },
      },
    });

    const currentTime = new Date();
    
    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: currentTime },
    });

    // Log audit event
    await this.logAuditEvent(user.id, 'LOGIN', 'USER', user.id);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: userWithTenant?.tenantId,
    };

    return {
      user: {
        ...user,
        organization: userWithTenant?.organization,
        orgRoles: userWithTenant?.userOrgRoles,
        subscription: userWithTenant?.subscription,
      },
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.generateRefreshToken(user.id, currentTime),
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        tenantId: true,
        verified: true,
      },
    });

    if (user && await verifyPassword(password, user.password)) {
      const { password: _, ...result } = user;
      return result;
    }

    return null;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetTokenExpiry,
      },
    });

    // Send password reset email
    await this.queuesService.addEmailJob(
      user.email,
      'Reset your password',
      'password-reset',
      {
        resetToken,
        resetUrl: `${this.configService.get('FRONTEND_URL')}/reset-password/${resetToken}`,
      }
    );

    // Log audit event
    await this.logAuditEvent(user.id, 'PASSWORD_RESET_REQUEST', 'USER', user.id);
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        lastLoginAt: new Date(), // Reset session start time on password change
      },
    });

    // Log audit event
    await this.logAuditEvent(user.id, 'PASSWORD_RESET', 'USER', user.id);
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        emailVerificationToken: null,
      },
    });

    // Log audit event
    await this.logAuditEvent(user.id, 'EMAIL_VERIFIED', 'USER', user.id);
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        subscription: true,
        organization: true,
        userOrgRoles: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  async refreshToken(userId: number, refreshTokenPayload?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        verified: true,
        lastLoginAt: true,
      },
    });

    if (!user || !user.verified) {
      throw new UnauthorizedException('Invalid user');
    }

    // Check absolute maximum session expiration
    const originalLoginTime = refreshTokenPayload?.iat 
      ? new Date(refreshTokenPayload.iat * 1000)
      : user.lastLoginAt || new Date();
    
    const daysSinceOriginalLogin = (Date.now() - originalLoginTime.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceOriginalLogin > this.MAX_SESSION_DAYS) {
      // Log forced logout
      await this.logAuditEvent(user.id, 'FORCED_LOGOUT', 'USER', user.id, {
        reason: 'Maximum session duration exceeded',
        daysSinceLogin: Math.floor(daysSinceOriginalLogin),
        maxAllowed: this.MAX_SESSION_DAYS
      });

      throw new UnauthorizedException(
        `Maximum session duration (${this.MAX_SESSION_DAYS} days) exceeded. Please login again.`
      );
    }

    // Log successful token refresh
    await this.logAuditEvent(user.id, 'TOKEN_REFRESH', 'USER', user.id, {
      daysSinceLogin: Math.floor(daysSinceOriginalLogin),
      remainingDays: Math.floor(this.MAX_SESSION_DAYS - daysSinceOriginalLogin)
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.generateRefreshToken(user.id, originalLoginTime),
      sessionInfo: {
        daysSinceLogin: Math.floor(daysSinceOriginalLogin),
        remainingDays: Math.floor(this.MAX_SESSION_DAYS - daysSinceOriginalLogin),
        willExpireAt: new Date(originalLoginTime.getTime() + (this.MAX_SESSION_DAYS * 24 * 60 * 60 * 1000)),
      }
    };
  }

  async logout(userId: number) {
    // Log logout event
    await this.logAuditEvent(userId, 'LOGOUT', 'USER', userId);

    // In production, you'd invalidate refresh tokens here
    // For now, we just log the event
    this.logger.log(`User ${userId} logged out`);
  }

  private generateRefreshToken(userId: number, originalLoginTime: Date): string {
    const maxExpiryTime = new Date(originalLoginTime.getTime() + (this.MAX_SESSION_DAYS * 24 * 60 * 60 * 1000));
    const slidingExpiryTime = new Date(Date.now() + (this.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000));
    
    const finalExpiryTime = slidingExpiryTime < maxExpiryTime ? slidingExpiryTime : maxExpiryTime;
    const expiresInSeconds = Math.floor((finalExpiryTime.getTime() - Date.now()) / 1000);

    return this.jwtService.sign(
      { 
        sub: userId, 
        type: 'refresh',
        iat: Math.floor(originalLoginTime.getTime() / 1000),
      },
      {
        secret: this.jwtConfig.refreshSecret, 
        expiresIn: expiresInSeconds + 's',
      }
    );
  }

  private async logAuditEvent(
    userId: number,
    action: string,
    resource: string,
    resourceId: number,
    metadata?: any
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log audit event', error);
    }
  }

  // Clean up database connection
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
