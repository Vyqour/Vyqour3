import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response, CookieOptions } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Cookie flags for localhost + Codespaces + production.
 * Cross-site (web :3000 → api :4000 on different hosts) needs SameSite=None; Secure.
 * Codespaces always serves HTTPS, so Secure is safe there even when NODE_ENV=development.
 */
function cookieBase(req: Request): CookieOptions {
  const host = (req.hostname || '').toLowerCase();
  const xfProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const isCodespace =
    host.endsWith('.app.github.dev') ||
    host.endsWith('.github.dev') ||
    host.includes('githubpreview');
  const isHttps =
    xfProto === 'https' ||
    req.secure ||
    isCodespace ||
    process.env.NODE_ENV === 'production';

  // Cross-origin SPA ↔ API (different ports/hosts) needs None+Secure when HTTPS.
  // Local http://localhost stays Lax so cookies still work without HTTPS.
  const sameSite: CookieOptions['sameSite'] = isHttps ? 'none' : 'lax';

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite,
    path: '/',
  };
}

function setAuthCookies(
  req: Request,
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  const base = cookieBase(req);
  res.cookie('access_token', accessToken, {
    ...base,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    ...base,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(req: Request, res: Response) {
  const base = cookieBase(req);
  res.clearCookie('access_token', base);
  res.clearCookie('refresh_token', base);
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register with email & password' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    setAuthCookies(req, res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    setAuthCookies(req, res, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken || (req.cookies?.refresh_token as string | undefined);
    if (!token) {
      return { success: false, message: 'No refresh token' };
    }
    const result = await this.auth.refresh(token);
    setAuthCookies(req, res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken || (req.cookies?.refresh_token as string | undefined);
    clearAuthCookies(req, res);
    return this.auth.logout(token);
  }

  @Post('logout-all')
  @HttpCode(200)
  @ApiBearerAuth()
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    clearAuthCookies(req, res);
    return this.auth.logoutAll(user.id);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  async me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    /* redirect handled by passport */
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as {
      googleId: string;
      email?: string;
      firstName: string;
      lastName?: string;
      avatarUrl?: string;
    };
    const result = await this.auth.validateGoogleUser(profile);
    setAuthCookies(req, res, result.accessToken, result.refreshToken);
    const webUrl = this.config.get<string>('webUrl') || 'http://localhost:3000';
    const redirect = `${webUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
    return res.redirect(redirect);
  }
}
