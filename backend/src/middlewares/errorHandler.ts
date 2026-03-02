import { ZodError } from "zod";
import type { NextFunction, Request, Response } from "express";
import { env, isProduction } from "../config/env";
import { logger } from "../config/logger";
import { HttpError } from "../utils/httpError";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
    return;
  }

  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      env: env.NODE_ENV,
    },
    "Unhandled error",
  );

  res.status(500).json({
    message: "Internal server error",
    ...(isProduction ? {} : { details: err }),
  });
};
