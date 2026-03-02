import type {
  ActivitiesResponse,
  Activity,
  AdminAuth,
  LeadPayload,
  LeadsResponse,
  LeadStatus,
} from "../types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type JsonObject = Record<string, unknown>;

const getErrorMessage = (body: unknown, fallback: string): string => {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return fallback;
};

const request = async <T>(
  endpoint: string,
  init: RequestInit = {},
  fallbackError = "Request failed",
): Promise<T> => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const responseText = await response.text();
  let json: JsonObject = {};
  if (responseText) {
    try {
      json = JSON.parse(responseText) as JsonObject;
    } catch {
      json = {};
    }
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(json, fallbackError));
  }

  return json as unknown as T;
};

const toSearch = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  return search.toString();
};

const adminHeaders = (auth: AdminAuth): HeadersInit => {
  if (auth.apiKey) {
    return { "x-api-key": auth.apiKey };
  }

  if (auth.username && auth.password) {
    return {
      Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
    };
  }

  return {};
};

export const api = {
  getActivities: (filters: {
    location?: string;
    type?: string;
    priceMin?: number;
    priceMax?: number;
    page?: number;
    pageSize?: number;
    featured?: boolean;
  }) => {
    const query = toSearch({
      location: filters.location,
      type: filters.type,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 10,
      featured: filters.featured ? "true" : undefined,
    });

    return request<ActivitiesResponse>(
      `/api/activities${query ? `?${query}` : ""}`,
      {},
      "Failed to load activities",
    );
  },

  getActivityBySlug: async (slug: string) => {
    const response = await request<{ data: Activity }>(
      `/api/activities/slug/${slug}`,
      {},
      "Failed to load activity",
    );
    return response.data;
  },

  createLead: (payload: LeadPayload) =>
    request<{ ok: boolean }>("/api/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAdminLeads: (auth: AdminAuth, status?: LeadStatus) => {
    const query = status ? `?status=${status}` : "";
    return request<LeadsResponse>(
      `/api/admin/leads${query}`,
      {
        headers: adminHeaders(auth),
      },
      "Failed to load admin leads",
    );
  },

  updateLeadStatus: (id: string, status: LeadStatus, auth: AdminAuth) =>
    request<{ data: { id: string; status: LeadStatus } }>(
      `/api/admin/leads/${id}`,
      {
        method: "PATCH",
        headers: adminHeaders(auth),
        body: JSON.stringify({ status }),
      },
      "Failed to update lead status",
    ),
};
