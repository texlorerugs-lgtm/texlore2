/**
 * Augment Express Request with authenticated user/admin identity.
 * Populated by middlewares/auth.ts and middlewares/admin.ts.
 */
import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      _id: Types.ObjectId;
      email: string;
      name: string;
      role: 'user';
    }
    interface AuthAdmin {
      id: string;
      _id: Types.ObjectId;
      email: string;
      name: string;
      role: 'admin' | 'superadmin';
      permissions: string[];
    }
    interface Request {
      user?: AuthUser;
      admin?: AuthAdmin;
    }
  }
}

export {};
