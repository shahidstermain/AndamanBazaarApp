const stripTags = (value: string): string => value.replace(/<[^>]*>/g, "").trim();

export const sanitizeUnknown = (value: unknown): unknown => {
  if (typeof value === "string") {
    return stripTags(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeUnknown(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeUnknown(entry)]),
    );
  }

  return value;
};
