import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Env } from '../lib/env';

const baseEnv: Env = {
  DB: {} as D1Database,
  MEDIA: {} as R2Bucket,
  TEAM_DOMAIN: 'https://team.cloudflareaccess.com',
  POLICY_AUD: 'aud',
  R2_ACCOUNT_ID: 'acct',
  R2_BUCKET: 'fei-blog-media',
  R2_PUBLIC_BASE: 'https://media.example',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
};

// Builds a minimal Pages Function context for handler tests.
export function makeCtx(
  db: D1Database,
  opts: { params?: Record<string, string>; request?: Request; env?: Partial<Env> } = {},
): EventContext<Env, string, Record<string, unknown>> {
  return {
    env: { ...baseEnv, DB: db, ...opts.env },
    params: opts.params ?? {},
    request: opts.request ?? new Request('https://site/'),
  } as unknown as EventContext<Env, string, Record<string, unknown>>;
}

export interface SeedPost {
  id: string;
  slug: string;
  title: string;
  body?: string;
  template?: string;
  cover_image_url?: string | null;
  status: 'draft' | 'published';
  published_at?: number | null;
  created_at?: number;
  updated_at?: number;
}

// An in-memory SQLite database exposed through the subset of the D1Database
// interface the Functions use, so handlers run real SQL in tests.
export function makeTestDB(seed: SeedPost[] = []): D1Database {
  const sqlite = new Database(':memory:');
  sqlite.exec(readFileSync(resolve(process.cwd(), 'migrations/0001_create_posts.sql'), 'utf8'));

  const insert = sqlite.prepare(
    `INSERT INTO posts
      (id, slug, title, body, template, cover_image_url, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const p of seed) {
    insert.run(
      p.id,
      p.slug,
      p.title,
      p.body ?? `# ${p.title}`,
      p.template ?? 'standard',
      p.cover_image_url ?? null,
      p.status,
      p.published_at ?? (p.status === 'published' ? 1 : null),
      p.created_at ?? 1,
      p.updated_at ?? 1,
    );
  }

  const stmt = (sql: string, params: unknown[]) => ({
    bind: (...args: unknown[]) => stmt(sql, args),
    async all<T>() {
      return { results: sqlite.prepare(sql).all(...params) as T[], success: true, meta: {} };
    },
    async first<T>() {
      return (sqlite.prepare(sql).get(...params) as T) ?? null;
    },
    async run() {
      const info = sqlite.prepare(sql).run(...params);
      return { success: true, meta: { changes: info.changes } };
    },
  });

  return { prepare: (sql: string) => stmt(sql, []) } as unknown as D1Database;
}
