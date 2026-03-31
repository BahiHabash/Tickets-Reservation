import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Payload, RequestWithUser } from '../../../common/interfaces';

export const GetUser = createParamDecorator(
  (data: keyof Payload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
