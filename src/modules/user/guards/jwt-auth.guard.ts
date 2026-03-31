import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { Payload } from '../../../common/interfaces';
import { IS_ANY_ROLE_KEY } from '../decorators/any-role.decorator';
import { UserRole } from '../enums/user-role.enum';
import { LoggingService } from '../../../core/logging';
import { formatUserLog } from '../../../common/helpers';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly logger: LoggingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAnyRole = this.reflector.getAllAndOverride<boolean>(
      IS_ANY_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      if (isAnyRole) {
        this.logger.assign({
          user: { role: UserRole.GUEST },
          messages: ['Access granted to guest: No token provided'],
        });
        request['user'] = { role: UserRole.GUEST };
        return true;
      }
      this.logger.assign({
        user: { role: UserRole.GUEST },
        messages: ['JWT Authorization failed: Token not found'],
      });
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload: Payload = await this.jwtService.verifyAsync(token);
      this.logger.assign({
        user: formatUserLog(payload),
        messages: [`Token verified successfully.`],
      });
      request['user'] = payload;
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (isAnyRole) {
        this.logger.assign({
          user: { role: UserRole.GUEST },
          messages: [`Token invalid (${errorMessage})`, `Proceeding as guest`],
        });
        request['user'] = { role: UserRole.GUEST };
        return true;
      }

      this.logger.assign({
        user: { role: UserRole.GUEST },
        messages: [`JWT Verification failed: ${errorMessage}`],
      });

      console.error('JWT Verification Error:', errorMessage);
      throw new UnauthorizedException(`Invalid token: ${errorMessage}`);
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
