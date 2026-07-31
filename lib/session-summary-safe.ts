export function summaryTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()]
  }

  return []
}
