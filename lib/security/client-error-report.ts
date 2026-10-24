const clientErrorScopes = ["global", "dashboard", "session-prep"] as const
const clientErrorNames = ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "URIError"] as const

export type ClientErrorScope = (typeof clientErrorScopes)[number]
export type ClientErrorReport = {
  scope: ClientErrorScope
  errorName: string
  digest?: string
}

const digestPattern = /^[A-Za-z0-9_-]{1,128}$/

export function sanitizeClientErrorName(value: unknown) {
  return typeof value === "string" && (clientErrorNames as readonly string[]).includes(value) ? value : "Error"
}

export function sanitizeClientErrorDigest(value: unknown) {
  return typeof value === "string" && digestPattern.test(value) ? value : undefined
}

export function parseClientErrorReport(value: unknown): ClientErrorReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.scope !== "string" ||
    !(clientErrorScopes as readonly string[]).includes(candidate.scope)
  ) {
    return null
  }

  const digest = sanitizeClientErrorDigest(candidate.digest)
  return {
    scope: candidate.scope as ClientErrorScope,
    errorName: sanitizeClientErrorName(candidate.errorName),
    ...(digest ? { digest } : {}),
  }
}
