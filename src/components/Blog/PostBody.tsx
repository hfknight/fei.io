import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import styled from 'styled-components';

// Sanitize BEFORE highlight: highlight then decorates the already-clean tree with
// hljs / token classNames, so sanitize never strips them (and the default schema
// keeps the language-* class highlight needs). react-markdown also strips
// dangerous URL protocols by default.
const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

// Media in markdown uses image syntax: ![alt](url). A video URL renders <video>.
const components: Components = {
  img(props) {
    const { src, alt } = props;
    const url = typeof src === 'string' ? src : undefined;
    if (url && VIDEO_RE.test(url)) {
      return <video src={url} controls playsInline preload="metadata" />;
    }
    return <img src={url} alt={alt ?? ''} loading="lazy" />;
  },
};

export function PostBody({ markdown }: { markdown: string }) {
  return (
    <Prose>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </Prose>
  );
}

const Prose = styled.div`
  color: rgba(255, 255, 255, 0.82);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1.05rem;
  line-height: 1.75;

  h1, h2, h3, h4 {
    color: #fff;
    line-height: 1.25;
    margin: 2.4rem 0 1rem;
    font-weight: 500;
  }
  h1 { font-size: 1.9rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.2rem; }

  p { margin: 0 0 1.3rem; }

  a {
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    transition: border-color 0.2s ease;
  }
  a:hover { border-color: color-mix(in srgb, var(--accent) 90%, transparent); }

  ul, ol { margin: 0 0 1.3rem 1.2rem; }
  li { margin: 0.35rem 0; }

  blockquote {
    margin: 1.6rem 0;
    padding: 0.4rem 0 0.4rem 1.2rem;
    border-left: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    color: rgba(255, 255, 255, 0.66);
    font-style: italic;
  }

  img, video {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 10px;
    margin: 1.8rem 0;
  }

  hr {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 2.4rem 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.6rem 0;
    font-size: 0.95rem;
  }
  th, td {
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  th { background: rgba(255, 255, 255, 0.04); }

  code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.88em;
  }
  :not(pre) > code {
    background: rgba(255, 255, 255, 0.08);
    padding: 0.12em 0.38em;
    border-radius: 4px;
  }
  pre {
    background: #0c0a1f;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 1.1rem 1.25rem;
    overflow-x: auto;
    margin: 1.6rem 0;
  }
  pre code { background: none; padding: 0; }

  /* highlight.js tokens, tuned to the dark palette */
  .hljs-comment, .hljs-quote { color: #6b7280; font-style: italic; }
  .hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #c4b5fd; }
  .hljs-string, .hljs-attr { color: #86efac; }
  .hljs-number, .hljs-literal { color: #fca5a5; }
  .hljs-title, .hljs-section, .hljs-function .hljs-title { color: var(--accent); }
  .hljs-type, .hljs-class .hljs-title { color: #93c5fd; }
  .hljs-tag, .hljs-name { color: #f9a8d4; }
`;
