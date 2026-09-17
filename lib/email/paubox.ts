import "server-only"

const PAUBOX_API_BASE_URL = "https://api.paubox.net/v1"
const DEFAULT_ENDPOINT_USERNAME = "sessionsteps"
const DEFAULT_FROM_EMAIL = "SessionSteps <notifications@sessionsteps.com>"

type EmailMessage = {
  to: string | string[]
  subject: string
  html: string
  text: string
}

type PauboxResponse = {
  sourceTrackingId?: string
  data?: {
    sourceTrackingId?: string
  }
  error?: string | { message?: string; detail?: string }
  errors?: Array<{ title?: string; message?: string; detail?: string }>
  message?: string
}

function getPauboxErrorMessage(result: PauboxResponse | null, status: number) {
  if (typeof result?.message === "string") return result.message
  if (typeof result?.error === "string") return result.error
  if (result?.error && typeof result.error === "object") {
    return result.error.message || result.error.detail || `Paubox rejected email delivery (${status})`
  }

  const details = result?.errors
    ?.map((error) => error.detail || error.message || error.title)
    .filter(Boolean)
    .join("; ")

  return details || `Paubox rejected email delivery (${status})`
}

export function isPauboxConfigured() {
  return Boolean(process.env.PAUBOX_API_KEY)
}

export async function sendPauboxEmail(message: EmailMessage) {
  const apiKey = process.env.PAUBOX_API_KEY
  if (!apiKey) throw new Error("PAUBOX_API_KEY is not configured")

  const endpointUsername = process.env.PAUBOX_ENDPOINT_USERNAME || DEFAULT_ENDPOINT_USERNAME
  const from = process.env.PAUBOX_FROM_EMAIL || DEFAULT_FROM_EMAIL
  const recipients = Array.isArray(message.to) ? message.to : [message.to]

  const response = await fetch(
    `${PAUBOX_API_BASE_URL}/${encodeURIComponent(endpointUsername)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Token token=${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          message: {
            recipients,
            headers: {
              from,
              subject: message.subject,
            },
            content: {
              "text/plain": message.text,
              "text/html": message.html,
            },
          },
        },
      }),
    },
  )

  const result = await response.json().catch(() => null) as PauboxResponse | null
  if (!response.ok) {
    throw new Error(getPauboxErrorMessage(result, response.status))
  }

  return {
    id: result?.sourceTrackingId || result?.data?.sourceTrackingId || null,
  }
}
