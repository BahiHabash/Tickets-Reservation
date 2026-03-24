import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestWithUser } from '../../../common/interfaces';
import { WideEventLoggerService } from '../../../core/logger';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: WideEventLoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user } = request;

    const hasRole = requiredRoles.some((role) => user.role === role);

    this.logger.assign({
      messages: [
        `Roles authorization: required=[${requiredRoles.join(', ')}], current=${user.role}, granted=${hasRole}`,
      ],
    });

    return hasRole;
  }
}
