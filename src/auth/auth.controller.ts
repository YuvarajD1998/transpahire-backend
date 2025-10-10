// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
  UnauthorizedException,
  Param,
  BadRequestException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { OrganizationRegisterDto } from './dto/organization-register.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { I18n, I18nContext } from 'nestjs-i18n';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard) // Rate limiting
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register a new candidate or individual recruiter',
    description: 'Register as a candidate or individual recruiter. For organization registration, use the /auth/register-organization endpoint.'
  })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input or organization role not allowed' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
    @I18n() i18n: I18nContext,
  ) {
    const result = await this.authService.register(registerDto);
    
    return {
      message: i18n.t('auth.registration_success'),
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Post('register-organization')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register a new organization with admin user',
    description: 'Create a new organization and register the admin user. This endpoint creates both the organization and the admin user account.'
  })
  @ApiResponse({ status: 201, description: 'Organization and admin user successfully registered' })
  @ApiResponse({ status:400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User or organization already exists' })
  @ApiBody({ type: OrganizationRegisterDto })
  async registerOrganization(
    @Body() organizationRegisterDto: OrganizationRegisterDto,
    @I18n() i18n: I18nContext,
  ) {
    const result = await this.authService.registerOrganization(organizationRegisterDto);
    
    return {
      message: i18n.t('auth.organization_registration_success', { 
        defaultValue: 'Organization and admin account successfully created' 
      }),
      organization: result.organization,
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @CurrentUser() user: any,
    @I18n() i18n: I18nContext,
  ) {
    const result = await this.authService.login(loginDto);
    
    return {
      message: i18n.t('auth.login_success'),
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @I18n() i18n: I18nContext,
  ) {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    
    return {
      message: i18n.t('auth.password_reset_sent'),
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @I18n() i18n: I18nContext,
  ) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
    
    return {
      message: i18n.t('auth.password_reset_success'),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refreshToken(@CurrentUser() user: any) {
    return this.authService.refreshToken(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out' })
  async logout(@CurrentUser() user: any) {
    await this.authService.logout(user.sub);
    
    return {
      message: 'Successfully logged out',
    };
  }

  @Public()
  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  async verifyEmail(@Param('token') token: string) {
    await this.authService.verifyEmail(token);
    
    return {
      message: 'Email successfully verified',
    };
  }
}
