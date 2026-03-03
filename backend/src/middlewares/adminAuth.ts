import basicAuth from "basic-auth";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";

const unauthorized = (next: NextFunction): void => {
  next(new HttpError(401, "Unauthorized"));
};

export const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.header("x-api-key");
  if (env.ADMIN_API_KEY && apiKey && apiKey === env.ADMIN_API_KEY) {
    next();
    return;
  }

  const credentials = basicAuth(req);
  if (
    credentials &&
    credentials.name === env.ADMIN_BASIC_USER &&
    credentials.pass === env.ADMIN_BASIC_PASS
  ) {
    next();
    return;
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="admin-leads"');
  unauthorized(next);
};
