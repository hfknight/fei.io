import type { BlogPost, BlogPostSummary } from '../types';

// Public read API (Pages Functions, same origin). Admin calls live in adminApi.

export async function fetchPublishedPosts(): Promise<BlogPostSummary[]> {
  const res = await fetch('/api/posts');
  if (!res.ok) throw new Error(`Failed to load posts (${res.status})`);
  const data = (await res.json()) as { posts: BlogPostSummary[] };
  return data.posts;
}

// Returns null for a 404 (draft or unknown slug); throws on other errors.
export async function fetchPost(slug: string): Promise<BlogPost | null> {
  const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load post (${res.status})`);
  const data = (await res.json()) as { post: BlogPost };
  return data.post;
}
