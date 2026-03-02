import nodemailer from "nodemailer";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import type { EmailProvider, LeadNotificationPayload } from "../types";

const renderLeadText = ({ lead }: LeadNotificationPayload): string => {
  return [
    "New AndamanBazaar lead received",
    `Lead ID: ${lead.id}`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email ?? "N/A"}`,
    `Preferred Date: ${lead.preferred_date.toISOString()}`,
    `Location: ${lead.location}`,
    `Activities: ${lead.activities.join(", ")}`,
    `Adults: ${lead.adults}`,
    `Children: ${lead.children}`,
    `Swimming Ability: ${lead.swimming_ability}`,
    `Budget: ${lead.budget}`,
    `Referral Source: ${lead.referral_source ?? "N/A"}`,
    `Special Requests: ${lead.special_requests ?? "N/A"}`,
    `Status: ${lead.status}`,
    `Created At: ${lead.createdAt.toISOString()}`,
  ].join("\n");
};

export class NodemailerProvider implements EmailProvider {
  private readonly transporter = env.EMAIL_SMTP_HOST
    ? nodemailer.createTransport({
        host: env.EMAIL_SMTP_HOST,
        port: env.EMAIL_SMTP_PORT,
        secure: env.EMAIL_SMTP_PORT === 465,
        auth:
          env.EMAIL_SMTP_USER && env.EMAIL_SMTP_PASS
            ? {
                user: env.EMAIL_SMTP_USER,
                pass: env.EMAIL_SMTP_PASS,
              }
            : undefined,
      })
    : nodemailer.createTransport({
        jsonTransport: true,
      });

  async sendLeadNotification(payload: LeadNotificationPayload): Promise<void> {
    if (!env.EMAIL_SMTP_HOST) {
      logger.info(
        { leadId: payload.lead.id },
        "EMAIL_SMTP_HOST not set, using JSON console transport for email.",
      );
    }

    await this.transporter.sendMail({
      from: env.EMAIL_SMTP_USER ?? "no-reply@andamanbazaar.local",
      to: env.OPERATOR_EMAIL,
      subject: `New lead: ${payload.lead.name} (${payload.lead.location})`,
      text: renderLeadText(payload),
    });
  }
}
