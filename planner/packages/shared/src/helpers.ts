// ─── Date helpers ────────────────────────────────────────────────────────────

export function tripDurationDays(startDate: string, endDate: string): number {
  return Math.round(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000
  );
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${start.toLocaleDateString("en-IN", opts)} – ${end.toLocaleDateString("en-IN", opts)}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ─── Budget helpers ──────────────────────────────────────────────────────────

export function budgetLevelLabel(level: "budget" | "midrange" | "premium"): string {
  return { budget: "Budget 💰", midrange: "Mid-range 💰💰", premium: "Premium 💰💰💰" }[
    level
  ];
}

export function paceLabel(pace: "relaxed" | "balanced" | "packed"): string {
  return {
    relaxed: "Relaxed 🌴",
    balanced: "Balanced 🏝️",
    packed: "Packed 🏃",
  }[pace];
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Rate-limit helpers ──────────────────────────────────────────────────────

/** Returns an hourly window key like "2024-01-15T10" */
export function currentRateLimitWindow(): string {
  return new Date().toISOString().slice(0, 13);
}

// ─── Class name helpers ──────────────────────────────────────────────────────

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
