import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: toNumber(process.env.PORT, 4000),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  ADMIN_API_KEY: process.env.ADMIN_API_KEY ?? "",
  ADMIN_BASIC_USER: process.env.ADMIN_BASIC_USER ?? "admin",
  ADMIN_BASIC_PASS: process.env.ADMIN_BASIC_PASS ?? "andaman123",
  OPERATOR_EMAIL: process.env.OPERATOR_EMAIL ?? "operator@example.com",
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "nodemailer",
  EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST,
  EMAIL_SMTP_PORT: toNumber(process.env.EMAIL_SMTP_PORT, 587),
  EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER,
  EMAIL_SMTP_PASS: process.env.EMAIL_SMTP_PASS,
  LEAD_WEBHOOK_URL: process.env.LEAD_WEBHOOK_URL,
  WEBHOOK_RETRY_ATTEMPTS: toNumber(process.env.WEBHOOK_RETRY_ATTEMPTS, 3),
  WEBHOOK_RETRY_BASE_MS: toNumber(process.env.WEBHOOK_RETRY_BASE_MS, 800),
};

export const isProduction = env.NODE_ENV === "production";
