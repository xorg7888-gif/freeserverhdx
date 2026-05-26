/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export enum ClaimStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  discord_id?: string;
  google_id?: string;
  avatar?: string;
  role: UserRole;
  is_banned: boolean;
  ip_address?: string;
  created_at: string;
  last_login?: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  user_id: string;
  username?: string; // joined
  email?: string;    // joined
  code: string;
  status: ClaimStatus;
  ip_address: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_username?: string;
  action: string;
  target_user?: string;
  timestamp: string;
  ip: string;
}

export interface AppSettings {
  discord_invite: string;
  discord_webhook_url: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  bannedUsers: number;
  dailyRegistrations: { date: string; count: number }[];
  claimActivity: { date: string; status: string; count: number }[];
}
