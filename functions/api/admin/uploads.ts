import { json, badRequest } from '../../lib/http';
import { presignUpload, mediaKey } from '../../lib/presign';
import type { Env } from '../../lib/env';

// POST /api/admin/uploads — issues a presigned PUT URL so the browser uploads
// the file directly to R2. Body: { filename, contentType }.
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let payload: { filename?: unknown; contentType?: unknown };
  try {
    payload = (await request.json()) as { filename?: unknown; contentType?: unknown };
  } catch {
    return badRequest('Invalid JSON');
  }

  const filename = typeof payload.filename === 'string' ? payload.filename : '';
  const contentType = typeof payload.contentType === 'string' ? payload.contentType : '';
  if (!filename || !contentType) {
    return badRequest('filename and contentType are required');
  }

  const result = await presignUpload(env, mediaKey(filename), contentType);
  return json(result);
};
