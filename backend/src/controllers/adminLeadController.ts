import type { Request, Response } from "express";
import { adminLeadQuerySchema, leadStatusSchema } from "../schemas/adminSchema";
import { adminLeadService } from "../services/adminLeadService";
import { HttpError } from "../utils/httpError";

export const adminLeadController = {
  async listLeads(req: Request, res: Response): Promise<void> {
    const query = adminLeadQuerySchema.parse(req.query);
    const result = await adminLeadService.listLeads(query);
    res.status(200).json(result);
  },

  async updateLeadStatus(req: Request, res: Response): Promise<void> {
    const payload = leadStatusSchema.parse(req.body);
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    try {
      const updatedLead = await adminLeadService.updateLeadStatus(leadId, payload.status);
      res.status(200).json({ data: updatedLead });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
        throw new HttpError(404, "Lead not found");
      }
      throw error;
    }
  },
};
