import { createElement } from 'react';
import { PostBody } from './PostBody';
import { getTemplate } from './templates';

interface Props {
  template: string;
  title: string;
  coverImageUrl: string | null;
  publishedAt: number | null;
  body: string;
  // When true, templates avoid viewport-width breakouts so they fit inside a
  // constrained container (the editor preview pane). Default false = full page.
  contained?: boolean;
}

// Renders a post's markdown body inside its selected template. Shared by the
// public post page and the admin editor preview so both look identical.
// createElement (not <Template/>) keeps the registry component from being
// treated as "created during render".
export function RenderedPost({ template, title, coverImageUrl, publishedAt, body, contained }: Props) {
  return createElement(getTemplate(template), {
    title,
    coverImageUrl,
    publishedAt,
    contained,
    children: <PostBody markdown={body} />,
  });
}
