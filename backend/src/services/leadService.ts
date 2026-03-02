import { prisma } from "../db/prisma";
import type { LeadCreateInput } from "../schemas/leadSchema";
import { NotificationService } from "./notification";

const notificationService = new NotificationService();

export const leadService = {
  async createLead(payload: LeadCreateInput) {
    const lead = await prisma.lead.create({
      data: {
        ...payload,
        preferred_date: new Date(payload.preferred_date),
      },
    });

    await notificationService.notifyLeadCreated({ lead });
    return lead;
  },
};
