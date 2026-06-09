export type UserRole = 'USER' | 'SUPERADMIN';
export type UserPlan = 'FREE' | 'PRO';

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  maxUploadPerMonth: number;
  maxFileSizeMb: number;
  aiRequestLimit: number;
  features: string[];
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  plan: UserPlan;
  uploadCount: number;
  createdAt: string;
  pricingPlan?: PricingPlan;
}

