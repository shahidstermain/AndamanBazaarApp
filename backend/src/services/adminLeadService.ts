import type { LeadStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import type { AdminLeadQuery } from "../schemas/adminSchema";

export const adminLeadService = {
  async listLeads(query: AdminLeadQuery) {
    const where = query.status ? { status: query.status } : {};
    const skip = (query.page - 1) * query.pageSize;

    const [total, leads] = await prisma.$transaction([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: query.pageSize,
      }),
    ]);

    return {
      data: leads,
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  },

  async updateLeadStatus(id: string, status: LeadStatus) {
    return prisma.lead.update({
      where: { id },
      data: { status },
    });
  },
};
