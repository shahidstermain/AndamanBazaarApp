export function safeRandomUUID(): string {
  try {
    if (
      typeof globalThis !== "undefined" &&
      "crypto" in globalThis &&
      typeof globalThis.crypto?.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // fall through to fallback
  }

  // Fallback: not a real UUID v4, but stable enough for ids/idempotency keys
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
