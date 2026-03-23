import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: Payload;
}

export interface Payload {
  sub: string;
  email: string;
  role: string;
}
