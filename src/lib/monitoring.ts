import * as Sentry from '@sentry/react';

type MonitoringContext = Record<string, unknown>;

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const sentryEnvironment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;
const sentryRelease = import.meta.env.VITE_APP_VERSION;
const originalConsoleError = console.error.bind(console);

let monitoringInitialized = false;
let consolePatched = false;
let isForwardingConsoleError = false;

const serializeValue = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeValue(entry, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeValue(entry, seen)])
    );
  }

  return value;
};

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  try {
    return JSON.stringify(serializeValue(value));
  } catch {
    return String(value);
  }
};

const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'string') {
    return new Error(value);
  }

  try {
    return new Error(JSON.stringify(serializeValue(value)));
  } catch {
    return new Error('Unknown error');
  }
};

export const captureException = (error: unknown, context?: MonitoringContext) => {
  if (!monitoringInitialized || !sentryDsn) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, serializeValue(value));
      }
    }

    Sentry.captureException(toError(error));
  });
};

const forwardConsoleError = (...args: unknown[]) => {
  if (!monitoringInitialized || !sentryDsn || isForwardingConsoleError) {
    return;
  }

  isForwardingConsoleError = true;

  try {
    const errorArg = args.find((arg) => arg instanceof Error);

    if (errorArg instanceof Error) {
      captureException(errorArg, { consoleArgs: args.map((arg) => serializeValue(arg)) });
      return;
    }

    Sentry.withScope((scope) => {
      scope.setExtra('consoleArgs', args.map((arg) => serializeValue(arg)));
      Sentry.captureMessage(args.map((arg) => formatValue(arg)).join(' '), 'error');
    });
  } finally {
    isForwardingConsoleError = false;
  }
};

const patchConsoleError = () => {
  if (consolePatched) {
    return;
  }

  console.error = (...args: unknown[]) => {
    originalConsoleError(...args);

    if (import.meta.env.PROD) {
      forwardConsoleError(...args);
    }
  };

  consolePatched = true;
};

export const initMonitoring = () => {
  if (monitoringInitialized || !sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    enabled: import.meta.env.PROD,
    environment: sentryEnvironment,
    release: sentryRelease,
    sendDefaultPii: false,
  });

  monitoringInitialized = true;
  patchConsoleError();
};
