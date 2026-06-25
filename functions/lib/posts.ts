import { uniqueSlug } from './slug';

export type PostStatus = 'draft' | 'published';
export type PostTemplate = 'standard' | 'photo-essay' | 'video-forward';

export const TEMPLATES = ['standard', 'photo-essay', 'video-forward'] as const;

export function isTemplate(v: unknown): v is PostTemplate {
  return typeof v === 'string' && (TEMPLATES as readonly string[]).includes(v);
}

// Row shapes as stored in D1 (snake_case).
interface PostRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  template: PostTemplate;
  cover_image_url: string | null;
  status: PostStatus;
  published_at: number | null;
  created_at: number;
  updated_at: number;
}

type PostSummaryRow = Pick<
  PostRow,
  'id' | 'slug' | 'title' | 'cover_image_url' | 'template' | 'published_at'
>;

// DTOs returned over the API (camelCase).
export interface PostDTO {
  id: string;
  slug: string;
  title: string;
  body: string;
  template: PostTemplate;
  coverImageUrl: string | null;
  status: PostStatus;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type PostSummaryDTO = Pick<
  PostDTO,
  'id' | 'slug' | 'title' | 'coverImageUrl' | 'template' | 'publishedAt'
>;

function rowToDTO(r: PostRow): PostDTO {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    body: r.body,
    template: r.template,
    coverImageUrl: r.cover_image_url,
    status: r.status,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function summaryRowToDTO(r: PostSummaryRow): PostSummaryDTO {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    coverImageUrl: r.cover_image_url,
    template: r.template,
    publishedAt: r.published_at,
  };
}

export async function listPublished(db: D1Database): Promise<PostSummaryDTO[]> {
  const { results } = await db
    .prepare(
      `SELECT id, slug, title, cover_image_url, template, published_at
       FROM posts WHERE status = 'published' ORDER BY published_at DESC`,
    )
    .all<PostSummaryRow>();
  return (results ?? []).map(summaryRowToDTO);
}

export async function getPublishedBySlug(db: D1Database, slug: string): Promise<PostDTO | null> {
  const row = await db
    .prepare(`SELECT * FROM posts WHERE slug = ? AND status = 'published'`)
    .bind(slug)
    .first<PostRow>();
  return row ? rowToDTO(row) : null;
}

export async function listAll(db: D1Database): Promise<PostDTO[]> {
  const { results } = await db
    .prepare(`SELECT * FROM posts ORDER BY updated_at DESC`)
    .all<PostRow>();
  return (results ?? []).map(rowToDTO);
}

export async function getById(db: D1Database, id: string): Promise<PostDTO | null> {
  const row = await db.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first<PostRow>();
  return row ? rowToDTO(row) : null;
}

async function getAllSlugs(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare(`SELECT slug FROM posts`).all<{ slug: string }>();
  return (results ?? []).map((r) => r.slug);
}

export interface CreatePostInput {
  title: string;
  body: string;
  template: PostTemplate;
  coverImageUrl: string | null;
  status: PostStatus;
}

export async function insertPost(db: D1Database, input: CreatePostInput): Promise<PostDTO> {
  const now = Date.now();
  const id = crypto.randomUUID();
  const slug = uniqueSlug(input.title, await getAllSlugs(db));
  const publishedAt = input.status === 'published' ? now : null;

  await db
    .prepare(
      `INSERT INTO posts
        (id, slug, title, body, template, cover_image_url, status, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      slug,
      input.title,
      input.body,
      input.template,
      input.coverImageUrl,
      input.status,
      publishedAt,
      now,
      now,
    )
    .run();

  return {
    id,
    slug,
    title: input.title,
    body: input.body,
    template: input.template,
    coverImageUrl: input.coverImageUrl,
    status: input.status,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  };
}

export interface UpdatePostInput {
  title?: string;
  body?: string;
  template?: PostTemplate;
  coverImageUrl?: string | null;
  status?: PostStatus;
}

export async function updatePost(
  db: D1Database,
  id: string,
  input: UpdatePostInput,
): Promise<PostDTO | null> {
  const current = await db
    .prepare(`SELECT * FROM posts WHERE id = ?`)
    .bind(id)
    .first<PostRow>();
  if (!current) return null;

  const now = Date.now();
  const next: PostRow = {
    ...current,
    title: input.title ?? current.title,
    body: input.body ?? current.body,
    template: input.template ?? current.template,
    cover_image_url:
      input.coverImageUrl !== undefined ? input.coverImageUrl : current.cover_image_url,
    status: input.status ?? current.status,
    updated_at: now,
  };
  // Stamp published_at on the first transition to published; keep it thereafter.
  if (next.status === 'published' && current.published_at === null) {
    next.published_at = now;
  }

  await db
    .prepare(
      `UPDATE posts
        SET title = ?, body = ?, template = ?, cover_image_url = ?, status = ?, published_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      next.title,
      next.body,
      next.template,
      next.cover_image_url,
      next.status,
      next.published_at,
      next.updated_at,
      id,
    )
    .run();

  return rowToDTO(next);
}

export async function deletePost(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare(`DELETE FROM posts WHERE id = ?`).bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}
