import axios from "axios";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { LeadNotificationPayload } from "./types";

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export class WebhookNotifier {
  constructor(
    private readonly webhookUrl: string | undefined,
    private readonly maxAttempts = env.WEBHOOK_RETRY_ATTEMPTS,
    private readonly baseDelayMs = env.WEBHOOK_RETRY_BASE_MS,
  ) {}

  async notifyLeadCreated(payload: LeadNotificationPayload): Promise<void> {
    if (!this.webhookUrl) {
      return;
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        await axios.post(
          this.webhookUrl,
          {
            event: "lead.created",
            data: payload.lead,
          },
          {
            timeout: 8000,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        return;
      } catch (error) {
        lastError = error;
        logger.error(
          {
            attempt,
            maxAttempts: this.maxAttempts,
            leadId: payload.lead.id,
            err: error,
          },
          "Webhook notification failed.",
        );
        if (attempt < this.maxAttempts) {
          await sleep(this.baseDelayMs * 2 ** (attempt - 1));
        }
      }
    }

    throw lastError;
  }
}
