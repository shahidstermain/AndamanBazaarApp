import type { Lead } from "@prisma/client";

export type LeadNotificationPayload = {
  lead: Lead;
};

export interface EmailProvider {
  sendLeadNotification(payload: LeadNotificationPayload): Promise<void>;
}
