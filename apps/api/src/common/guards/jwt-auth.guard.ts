import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global JWT guard.
 * - OPTIONS: always allow (CORS preflight)
 * - Public routes: still attempt JWT so @CurrentUser() works (cart, product, etc.)
 *   but never block unauthenticated callers
 * - Protected routes: require a valid user
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ method?: string }>();
    if (req?.method === 'OPTIONS') {
      return true;
    }

    // Always run Passport so public handlers can receive req.user when a token is present
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Optional auth — attach user when valid, otherwise continue as guest
      if (err || !user) {
        return null as TUser;
      }
      return user;
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
