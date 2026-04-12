// ============================================================
// Structured Frontend Logger
// Replaces raw console.log with levelled, environment-aware logging.
// In production: info/debug logs suppressed; warn/error always shown.
// ============================================================

type LogLevel = "debug" | "info" | "warn" | "error";
type LogMeta = Record<string, unknown>;

const IS_DEV =
  import.meta.env.DEV || import.meta.env.VITE_ENV === "development";
const IS_E2E = import.meta.env.VITE_E2E_BYPASS_AUTH === "true";

/** Minimum level that will be printed — higher in production. */
const MIN_LEVEL: LogLevel = IS_DEV || IS_E2E ? "debug" : "warn";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

function format(level: LogLevel, message: string, meta?: LogMeta): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${message}${meta ? " " + JSON.stringify(meta) : ""}`;
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    if (!shouldLog("debug")) return;
    console.debug(format("debug", message, meta));
  },

  info(message: string, meta?: LogMeta): void {
    if (!shouldLog("info")) return;
    console.info(format("info", message, meta));
  },

  warn(message: string, meta?: LogMeta): void {
    if (!shouldLog("warn")) return;
    console.warn(format("warn", message, meta));
  },

  error(message: string, errorOrMeta?: unknown, meta?: LogMeta): void {
    if (!shouldLog("error")) return;
    if (errorOrMeta instanceof Error) {
      console.error(
        format("error", message, {
          ...meta,
          error: errorOrMeta.message,
          stack: errorOrMeta.stack,
        }),
      );
    } else {
      console.error(format("error", message, (errorOrMeta as LogMeta) ?? meta));
    }
  },
};

export default logger;
