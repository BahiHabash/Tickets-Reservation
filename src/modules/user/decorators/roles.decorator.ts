import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { UserRole } from '../../../common/enums/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
