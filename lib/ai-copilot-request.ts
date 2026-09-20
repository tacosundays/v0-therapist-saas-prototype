import { z } from "zod"

export const maxCopilotPayloadBytes = 40_000

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4_000),
}).strict()

const copilotRequestSchema = z.object({
  question: z.string().trim().min(1).max(2_000),
  history: z.array(historyMessageSchema).max(8).default([]),
}).strict()

export type CopilotRequest = z.infer<typeof copilotRequestSchema>

export function parseCopilotRequest(rawBody: string): CopilotRequest | null {
  if (new TextEncoder().encode(rawBody).byteLength > maxCopilotPayloadBytes) return null

  try {
    const result = copilotRequestSchema.safeParse(JSON.parse(rawBody))
    return result.success ? result.data : null
  } catch {
    return null
  }
}
