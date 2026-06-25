// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { onRequestPost } from './uploads';
import { makeTestDB, makeCtx, jsonRequest } from '../../test/d1';

interface UploadResp {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

const upload = (body: unknown) => jsonRequest('https://s/api/admin/uploads', 'POST', body);

describe('admin uploads', () => {
  it('returns a presigned PUT URL and a public URL', async () => {
    const res = await onRequestPost(
      makeCtx(makeTestDB(), { request: upload({ filename: 'pic.png', contentType: 'image/png' }) }),
    );
    const body = (await res.json()) as UploadResp;

    expect(body.uploadUrl).toContain('.r2.cloudflarestorage.com');
    expect(body.uploadUrl).toContain('X-Amz-Signature=');
    expect(body.publicUrl.startsWith('https://media.example/uploads/')).toBe(true);
    expect(body.key.startsWith('uploads/')).toBe(true);
  });

  it('400s when filename or contentType is missing', async () => {
    const res = await onRequestPost(makeCtx(makeTestDB(), { request: upload({ filename: 'pic.png' }) }));
    expect(res.status).toBe(400);
  });
});
