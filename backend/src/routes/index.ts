import { Router } from "express";
import { activityRouter } from "./activityRoutes";
import { adminLeadRouter } from "./adminLeadRoutes";
import { leadRouter } from "./leadRoutes";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

apiRouter.use("/activities", activityRouter);
apiRouter.use("/leads", leadRouter);
apiRouter.use("/admin/leads", adminLeadRouter);

export { apiRouter };
