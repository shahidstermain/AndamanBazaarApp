import { Router } from "express";
import { leadController } from "../controllers/leadController";
import { leadRateLimiter } from "../middlewares/leadRateLimiter";
import { asyncHandler } from "../utils/asyncHandler";

const leadRouter = Router();

leadRouter.post("/", leadRateLimiter, asyncHandler(leadController.createLead));

export { leadRouter };
