import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import type { ActivitiesFilterInput } from "../schemas/activitySchema";

export const activityService = {
  async getActivities(filters: ActivitiesFilterInput) {
    const where: Prisma.ActivityWhereInput = {};

    if (filters.location) {
      where.location = { contains: filters.location, mode: "insensitive" };
    }

    if (filters.type) {
      where.types = { has: filters.type };
    }

    const andFilters: Prisma.ActivityWhereInput[] = [];

    if (typeof filters.priceMin === "number") {
      andFilters.push({
        price_max: {
          gte: filters.priceMin,
        },
      });
    }

    if (typeof filters.priceMax === "number") {
      andFilters.push({
        price_min: {
          lte: filters.priceMax,
        },
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const take = filters.featured ? Math.min(filters.pageSize, 6) : filters.pageSize;
    const skip = filters.featured ? 0 : (filters.page - 1) * filters.pageSize;

    const [total, items] = await prisma.$transaction([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        include: {
          operator: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

    return {
      data: items,
      meta: {
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages,
      },
    };
  },

  async getActivityById(id: string) {
    return prisma.activity.findUnique({
      where: { id },
      include: {
        operator: true,
      },
    });
  },

  async getActivityBySlug(slug: string) {
    return prisma.activity.findUnique({
      where: { slug },
      include: {
        operator: true,
      },
    });
  },
};
