import { Profile, Listing } from "../types";
export * from "../types";

// ===== Admin & Reports Types =====

export type AppRole = "admin" | "moderator" | "user";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type ReportReason =
  | "scam"
  | "offensive"
  | "duplicate"
  | "wrong_category"
  | "sold"
  | "other";

export interface Report {
  id: string;
  reporter_id: string;
  listing_id: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  reporter?: Profile;
  listing?: Listing;
}
