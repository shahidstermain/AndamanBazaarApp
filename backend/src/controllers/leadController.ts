import type { Request, Response } from "express";
import { leadCreateSchema } from "../schemas/leadSchema";
import { leadService } from "../services/leadService";
import { sanitizeUnknown } from "../utils/sanitize";

export const leadController = {
  async createLead(req: Request, res: Response): Promise<void> {
    const sanitizedBody = sanitizeUnknown(req.body);
    const payload = leadCreateSchema.parse(sanitizedBody);
    await leadService.createLead(payload);
    res.status(201).json({ ok: true });
  },
};
