export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  profileImage?: { url: string; publicId: string };
  isVerified: boolean;
  isBlocked: boolean;
  role: 'user';
  addresses?: unknown[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  profileImage?: { url: string; publicId: string };
  role: 'admin' | 'superadmin';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
