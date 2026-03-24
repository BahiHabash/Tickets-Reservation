import { SetMetadata } from '@nestjs/common';

export const IS_ANY_ROLE_KEY = 'isAnyRole';
export const AnyRole = () => SetMetadata(IS_ANY_ROLE_KEY, true);
