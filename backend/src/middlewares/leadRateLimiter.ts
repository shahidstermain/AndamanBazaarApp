import rateLimit from "express-rate-limit";

export const leadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many lead submissions from this IP. Please try again in an hour.",
  },
});
