import { isTemplate } from './posts';
import type { CreatePostInput, UpdatePostInput, PostStatus, PostTemplate } from './posts';

function isStatus(v: unknown): v is PostStatus {
  return v === 'draft' || v === 'published';
}

export function parseCreatePost(payload: unknown): CreatePostInput | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.title !== 'string' || p.title.trim() === '') return null;
  if (typeof p.body !== 'string') return null;

  const template: PostTemplate = isTemplate(p.template) ? p.template : 'standard';
  const status: PostStatus = isStatus(p.status) ? p.status : 'draft';
  const coverImageUrl = typeof p.coverImageUrl === 'string' ? p.coverImageUrl : null;

  return { title: p.title, body: p.body, template, coverImageUrl, status };
}

// Partial update: only present keys are applied; any present-but-invalid key fails.
export function parseUpdatePost(payload: unknown): UpdatePostInput | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  const out: UpdatePostInput = {};

  if ('title' in p) {
    if (typeof p.title !== 'string' || p.title.trim() === '') return null;
    out.title = p.title;
  }
  if ('body' in p) {
    if (typeof p.body !== 'string') return null;
    out.body = p.body;
  }
  if ('template' in p) {
    if (!isTemplate(p.template)) return null;
    out.template = p.template;
  }
  if ('status' in p) {
    if (!isStatus(p.status)) return null;
    out.status = p.status;
  }
  if ('coverImageUrl' in p) {
    if (p.coverImageUrl !== null && typeof p.coverImageUrl !== 'string') return null;
    out.coverImageUrl = p.coverImageUrl;
  }

  return out;
}
