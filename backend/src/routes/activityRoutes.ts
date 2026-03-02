import { Router } from "express";
import { activityController } from "../controllers/activityController";
import { asyncHandler } from "../utils/asyncHandler";

const activityRouter = Router();

activityRouter.get("/", asyncHandler(activityController.listActivities));
activityRouter.get("/slug/:slug", asyncHandler(activityController.getActivityBySlug));
activityRouter.get("/:id", asyncHandler(activityController.getActivityById));

export { activityRouter };
