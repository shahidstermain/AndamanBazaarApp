import type { Request, Response } from "express";
import { activitiesFilterSchema } from "../schemas/activitySchema";
import { activityService } from "../services/activityService";
import { HttpError } from "../utils/httpError";

export const activityController = {
  async listActivities(req: Request, res: Response): Promise<void> {
    const filters = activitiesFilterSchema.parse(req.query);
    const result = await activityService.getActivities(filters);
    res.status(200).json(result);
  },

  async getActivityById(req: Request, res: Response): Promise<void> {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const activity = await activityService.getActivityById(id);
    if (!activity) {
      throw new HttpError(404, "Activity not found");
    }

    res.status(200).json({ data: activity });
  },

  async getActivityBySlug(req: Request, res: Response): Promise<void> {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const activity = await activityService.getActivityBySlug(slug);
    if (!activity) {
      throw new HttpError(404, "Activity not found");
    }

    res.status(200).json({ data: activity });
  },
};
