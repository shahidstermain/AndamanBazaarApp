import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new HttpError(404, "Route not found"));
};
