import { logger } from "../../../config/logger";
import type { EmailProvider, LeadNotificationPayload } from "../types";

export class SendGridProvider implements EmailProvider {
  async sendLeadNotification(payload: LeadNotificationPayload): Promise<void> {
    logger.warn(
      { leadId: payload.lead.id },
      "SendGrid provider placeholder is active. Configure real SendGrid integration before production use.",
    );
  }
}
