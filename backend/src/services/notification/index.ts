import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { NodemailerProvider } from "./providers/nodemailerProvider";
import { SendGridProvider } from "./providers/sendgridProvider";
import type { EmailProvider, LeadNotificationPayload } from "./types";
import { WebhookNotifier } from "./webhookNotifier";

const getEmailProvider = (): EmailProvider => {
  if (env.EMAIL_PROVIDER.toLowerCase() === "sendgrid") {
    return new SendGridProvider();
  }

  return new NodemailerProvider();
};

export class NotificationService {
  private readonly emailProvider: EmailProvider;
  private readonly webhookNotifier: WebhookNotifier;

  constructor() {
    this.emailProvider = getEmailProvider();
    this.webhookNotifier = new WebhookNotifier(env.LEAD_WEBHOOK_URL);
  }

  async notifyLeadCreated(payload: LeadNotificationPayload): Promise<void> {
    try {
      await this.emailProvider.sendLeadNotification(payload);
    } catch (error) {
      logger.error({ err: error, leadId: payload.lead.id }, "Failed to send lead email.");
    }

    try {
      await this.webhookNotifier.notifyLeadCreated(payload);
    } catch (error) {
      logger.error({ err: error, leadId: payload.lead.id }, "Failed to send lead webhook.");
    }
  }
}
