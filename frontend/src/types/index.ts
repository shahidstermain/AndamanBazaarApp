export type LeadStatus = "new" | "contacted" | "confirmed";

export interface Operator {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  location: string;
}

export interface Activity {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  types: string[];
  duration_minutes: number;
  price_min: number;
  price_max: number;
  age_min?: number | null;
  images: string[];
  safety_notes: string;
  operator?: Operator | null;
}

export interface ActivitiesResponse {
  data: Activity[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface LeadPayload {
  name: string;
  phone: string;
  email?: string;
  preferred_date: string;
  location: string;
  activities: string[];
  adults: number;
  children: number;
  swimming_ability: string;
  budget: number;
  referral_source?: string;
  special_requests?: string;
  consent: boolean;
}

export interface Lead extends LeadPayload {
  id: string;
  status: LeadStatus;
  createdAt: string;
  preferred_date: string;
}

export interface LeadsResponse {
  data: Lead[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface AdminAuth {
  username?: string;
  password?: string;
  apiKey?: string;
}
