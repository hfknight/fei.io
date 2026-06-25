// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { presignUpload, mediaKey } from './presign';
import type { Env } from './env';

function makeEnv(over: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    MEDIA: {} as R2Bucket,
    TEAM_DOMAIN: 'https://team.cloudflareaccess.com',
    POLICY_AUD: 'aud',
    R2_ACCOUNT_ID: 'acct123',
    R2_BUCKET: 'fei-blog-media',
    R2_PUBLIC_BASE: 'https://media.example',
    R2_ACCESS_KEY_ID: 'AKIDEXAMPLE',
    R2_SECRET_ACCESS_KEY: 'secretkey',
    ...over,
  };
}

describe('mediaKey', () => {
  it('produces a sanitized key under uploads/', () => {
    const key = mediaKey('My Photo (1).PNG');
    expect(key.startsWith('uploads/')).toBe(true);
    expect(key.endsWith('my-photo-1-.png') || key.endsWith('my-photo-1.png')).toBe(true);
    expect(key).not.toMatch(/\s/);
  });
});

describe('presignUpload', () => {
  it('returns a signed PUT URL targeting the bucket/key with an expiry', async () => {
    const env = makeEnv();
    const result = await presignUpload(env, 'uploads/abc-photo.png', 'image/png', 3600);

    expect(result.key).toBe('uploads/abc-photo.png');
    expect(result.uploadUrl).toContain('acct123.r2.cloudflarestorage.com');
    expect(result.uploadUrl).toContain('/fei-blog-media/uploads/abc-photo.png');
    expect(result.uploadUrl).toContain('X-Amz-Expires=3600');
    expect(result.uploadUrl).toContain('X-Amz-Signature=');
    expect(result.uploadUrl).toContain('X-Amz-Credential=');
  });

  it('derives the public URL from R2_PUBLIC_BASE without a double slash', async () => {
    const env = makeEnv({ R2_PUBLIC_BASE: 'https://media.example/' });
    const result = await presignUpload(env, 'uploads/x.mp4', 'video/mp4');
    expect(result.publicUrl).toBe('https://media.example/uploads/x.mp4');
  });
});
