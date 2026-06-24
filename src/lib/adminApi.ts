import type { BlogPost, PostStatus, PostTemplate } from '../types';

// Admin API client. Routes are behind Cloudflare Access at the edge, so the
// browser's Access session cookie authorizes these same-origin calls.

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export interface PostInput {
  title: string;
  body: string;
  template: PostTemplate;
  coverImageUrl: string | null;
  status: PostStatus;
}

export async function listAllPosts(): Promise<BlogPost[]> {
  const res = await fetch('/api/admin/posts');
  return (await jsonOrThrow<{ posts: BlogPost[] }>(res)).posts;
}

export async function getPost(id: string): Promise<BlogPost> {
  const res = await fetch(`/api/admin/posts/${id}`);
  return (await jsonOrThrow<{ post: BlogPost }>(res)).post;
}

export async function createPost(input: PostInput): Promise<BlogPost> {
  const res = await fetch('/api/admin/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow<{ post: BlogPost }>(res)).post;
}

export async function updatePost(id: string, input: Partial<PostInput>): Promise<BlogPost> {
  const res = await fetch(`/api/admin/posts/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow<{ post: BlogPost }>(res)).post;
}

export async function deletePost(id: string): Promise<void> {
  await jsonOrThrow<{ ok: boolean }>(await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' }));
}

interface UploadTarget {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

// Requests a presigned URL, then uploads the file straight to R2. Returns the
// stable public URL to reference in a post.
export async function uploadFile(file: File): Promise<string> {
  const res = await fetch('/api/admin/uploads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });
  const { uploadUrl, publicUrl } = await jsonOrThrow<UploadTarget>(res);

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);

  return publicUrl;
}
