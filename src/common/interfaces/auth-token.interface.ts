import { Request } from 'express';
import { UserRole } from '../enums/user-role.enum';

export interface RequestWithUser extends Request {
  user: Payload;
}

export interface Payload {
  sub: string;
  email: string;
  role: UserRole;
}
