import { createHash } from "node:crypto"

type FingerprintContext = Record<string, unknown> & {
  generatedAt?: string
}

export function createSessionSummaryFingerprint(context: FingerprintContext) {
  const { generatedAt: _generatedAt, ...sourceData } = context
  return createHash("sha256")
    .update(JSON.stringify(sourceData))
    .digest("hex")
}
