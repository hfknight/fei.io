import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import styled from 'styled-components';
import { hljsTokens, CODE_ISLAND, CODE_ISLAND_RIM } from '../../styles/codeTheme';

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
  // A code block is a dark island, whatever the page sits on. `[data-surface]` is a plain
  // attribute selector, so flipping it here re-resolves the tokens inside: --accent goes
  // back to the yellow .hljs-title was tuned for, rather than the light surface's dark
  // olive on a near-black ground.
  pre({ children }) {
    return <pre data-surface="inverted">{children}</pre>;
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
  color: ${p => p.theme.color.ink};
  font-family: ${p => p.theme.font.body};
  font-size: 1.05rem;
  line-height: 1.6;

  h1, h2, h3, h4 {
    color: ${p => p.theme.color.ink};
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
    color: ${p => p.theme.color.inkMuted};
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
    border-top: 1px solid ${p => p.theme.color.border};
    margin: 2.4rem 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.6rem 0;
    font-size: 0.95rem;
  }
  th, td {
    border: 1px solid ${p => p.theme.color.border};
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  th { background: color-mix(in srgb, ${p => p.theme.color.ink} 4%, transparent); }

  code {
    font-family: ${p => p.theme.font.mono};
    font-size: 0.88em;
  }
  :not(pre) > code {
    background: color-mix(in srgb, ${p => p.theme.color.ink} 8%, transparent);
    padding: 0.12em 0.38em;
    border-radius: 4px;
  }
  /* The island. Its ground is a tint of whatever the page already is, shared with the lab
     entries (styles/codeTheme.ts) — it used to be a literal #0c0a1f here, which turned out
     to be this exact tint over this exact surface, written out by hand. It carries
     data-surface="inverted" (see components.pre), and re-declares colour because CSS
     inherits Prose's *computed* ink, so the attribute flip alone would leave dark text on
     a near-black block. */
  pre {
    background: ${CODE_ISLAND};
    border: 1px solid ${CODE_ISLAND_RIM};
    color: ${p => p.theme.color.ink};
    border-radius: 10px;
    padding: 1.1rem 1.25rem;
    overflow-x: auto;
    margin: 1.6rem 0;
  }
  pre code { background: none; padding: 0; }

  /* highlight.js tokens — shared with the lab entries, see styles/codeTheme.ts */
  ${hljsTokens}
`;
