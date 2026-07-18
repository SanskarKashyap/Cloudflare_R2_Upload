const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_S3_ENDPOINT,
    R2_PUBLIC_BASE_URL,
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
} = process.env

if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME
) {
    throw new Error('Missing environment variables.')
}

const r2AccountId: string = R2_ACCOUNT_ID
const r2AccessKeyId: string = R2_ACCESS_KEY_ID
const r2SecretAccessKey: string = R2_SECRET_ACCESS_KEY
const r2BucketName: string = R2_BUCKET_NAME
const r2S3Endpoint: string = R2_S3_ENDPOINT || `https://${r2AccountId}.r2.cloudflarestorage.com`
const r2PublicBaseUrl: string | undefined = R2_PUBLIC_BASE_URL

// Optional: the PDF-text Supabase cache is skipped (not a startup failure) when unset.
const supabaseUrl: string | undefined = SUPABASE_URL || undefined
const supabaseSecretKey: string | undefined = SUPABASE_SECRET_KEY || undefined

export {
    r2AccountId,
    r2AccessKeyId,
    r2SecretAccessKey,
    r2BucketName,
    r2S3Endpoint,
    r2PublicBaseUrl,
    supabaseUrl,
    supabaseSecretKey
}
