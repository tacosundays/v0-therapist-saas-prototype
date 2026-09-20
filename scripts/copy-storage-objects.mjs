import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const execute = process.argv.includes("--execute")
const sourceUrl = process.env.SOURCE_SUPABASE_URL
const sourceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY
const targetUrl = process.env.TARGET_SUPABASE_URL
const targetKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY

if (!sourceUrl || !sourceKey || !targetUrl || !targetKey) {
  console.error(
    "Set SOURCE_SUPABASE_URL, SOURCE_SUPABASE_SERVICE_ROLE_KEY, " +
      "TARGET_SUPABASE_URL, and TARGET_SUPABASE_SERVICE_ROLE_KEY.",
  )
  process.exit(1)
}

if (sourceUrl === targetUrl) {
  console.error("Source and target projects must be different.")
  process.exit(1)
}

const source = createClient(sourceUrl, sourceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const target = createClient(targetUrl, targetKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function listFiles(client, bucket, prefix = "") {
  const files = []
  let offset = 0

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    })
    if (error) throw error
    if (!data?.length) break

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id) files.push({ path, metadata: item.metadata ?? {} })
      else files.push(...(await listFiles(client, bucket, path)))
    }

    if (data.length < 100) break
    offset += data.length
  }

  return files
}

const { data: sourceBuckets, error: bucketsError } =
  await source.storage.listBuckets()
if (bucketsError) throw bucketsError

const summary = []
for (const bucket of sourceBuckets) {
  const files = await listFiles(source, bucket.name)
  let bytes = 0
  let verified = 0

  if (execute) {
    const { data: existingTargetBucket } = await target.storage.getBucket(bucket.name)
    if (!existingTargetBucket) {
      const { error } = await target.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.file_size_limit ?? undefined,
        allowedMimeTypes: bucket.allowed_mime_types ?? undefined,
      })
      if (error) throw error
    }
  }

  for (const file of files) {
    const { data: blob, error: downloadError } = await source.storage
      .from(bucket.name)
      .download(file.path)
    if (downloadError) throw downloadError

    const body = Buffer.from(await blob.arrayBuffer())
    bytes += body.length
    if (!execute) continue

    const { error: uploadError } = await target.storage
      .from(bucket.name)
      .upload(file.path, body, {
        cacheControl: String(file.metadata.cacheControl ?? "3600"),
        contentType: file.metadata.mimetype ?? blob.type ?? undefined,
        upsert: true,
      })
    if (uploadError) throw uploadError

    const { data: restored, error: verifyError } = await target.storage
      .from(bucket.name)
      .download(file.path)
    if (verifyError) throw verifyError
    const restoredBody = Buffer.from(await restored.arrayBuffer())
    const digest = (value) => createHash("sha256").update(value).digest("hex")
    if (digest(body) !== digest(restoredBody)) {
      throw new Error(`Hash verification failed in bucket ${bucket.name}`)
    }
    verified += 1
  }

  summary.push({ bucket: bucket.name, files: files.length, bytes, verified })
}

console.table(summary)
if (!execute) {
  console.log("Inventory only. Re-run with --execute to copy and verify objects.")
} else {
  console.log("Storage copy and SHA-256 verification completed.")
}
