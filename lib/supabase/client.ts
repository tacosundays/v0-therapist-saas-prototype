import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function getUrlDebug() {
  try {
    const parsedUrl = new URL(supabaseUrl)
    return {
      valid: true,
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
    }
  } catch {
    return {
      valid: false,
      protocol: null,
      host: null,
    }
  }
}

export function getSupabaseBrowserConfigStatus() {
  const urlDebug = getUrlDebug()

  return {
    hasUrl: Boolean(supabaseUrl),
    urlValid: urlDebug.valid,
    urlProtocol: urlDebug.protocol,
    urlHost: urlDebug.host,
    hasAnonKey: Boolean(supabaseAnonKey),
    anonKeyLength: supabaseAnonKey.length,
  }
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Singleton instance for client-side usage
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function getClient() {
  if (!clientInstance) {
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return clientInstance
}
