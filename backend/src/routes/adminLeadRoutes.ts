import { Router } from "express";
import { adminLeadController } from "../controllers/adminLeadController";
import { adminAuth } from "../middlewares/adminAuth";
import { asyncHandler } from "../utils/asyncHandler";

const adminLeadRouter = Router();

adminLeadRouter.use(adminAuth);
adminLeadRouter.get("/", asyncHandler(adminLeadController.listLeads));
adminLeadRouter.patch("/:id", asyncHandler(adminLeadController.updateLeadStatus));

export { adminLeadRouter };
