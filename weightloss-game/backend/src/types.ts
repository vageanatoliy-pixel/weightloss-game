import type { Request } from 'express';

export type JwtUser = {
  userId: string;
  role: 'USER' | 'ADMIN';
};

export type AuthRequest = Request & {
  user?: JwtUser;
};
