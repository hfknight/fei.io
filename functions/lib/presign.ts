import { AwsClient } from 'aws4fetch';
import type { Env } from './env';

// Uploads are immutable (unique keys), so they can be cached aggressively at the
// edge. Signed into the PUT and echoed to the client so both stay in sync.
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export interface PresignResult {
  uploadUrl: string; // presigned PUT URL the browser uploads to directly
  publicUrl: string; // stable public URL the post references
  key: string;
  cacheControl: string; // the client must send this header on the PUT
}

// Builds a collision-resistant, sanitized object key under uploads/.
export function mediaKey(filename: string): string {
  const clean = filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `uploads/${stamp}-${rand}-${clean || 'file'}`;
}

// Issues a presigned PUT URL for R2 (S3 API). The browser PUTs the file directly
// to this URL, so large media never streams through the Function.
export async function presignUpload(
  env: Env,
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<PresignResult> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });

  const endpoint = new URL(
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${encodeURI(key)}`,
  );
  endpoint.searchParams.set('X-Amz-Expires', String(expiresIn));

  const signed = await client.sign(
    new Request(endpoint, {
      method: 'PUT',
      headers: { 'content-type': contentType, 'cache-control': CACHE_CONTROL },
    }),
    { aws: { signQuery: true } },
  );

  return {
    uploadUrl: signed.url,
    publicUrl: `${env.R2_PUBLIC_BASE.replace(/\/+$/, '')}/${key}`,
    key,
    cacheControl: CACHE_CONTROL,
  };
}
