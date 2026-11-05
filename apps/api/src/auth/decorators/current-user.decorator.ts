import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SafeUser } from '../interfaces/auth-response.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof SafeUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as SafeUser;
    return data ? user?.[data] : user;
  },
);

