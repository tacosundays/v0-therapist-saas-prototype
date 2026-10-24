"use client"

import {
  sanitizeClientErrorDigest,
  sanitizeClientErrorName,
  type ClientErrorScope,
} from "@/lib/security/client-error-report"

type ReportableError = Error & { digest?: string }

export function reportClientError(scope: ClientErrorScope, error: ReportableError) {
  const digest = sanitizeClientErrorDigest(error?.digest)
  const payload = {
    scope,
    errorName: sanitizeClientErrorName(error?.name),
    ...(digest ? { digest } : {}),
  }

  void fetch("/api/monitoring/errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined)
}
