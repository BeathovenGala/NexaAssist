import type { AuthUser } from './auth-user';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends AuthUser {}
  }
}

export {};
