import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import PageTransition from '../components/PageTransition';
import ShimmerText from '../components/ShimmerText';
import { RenderedPost } from '../components/Blog/RenderedPost';
import { fetchPost } from '../lib/blogApi';
import type { BlogPost } from '../types';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; post: BlogPost }
  | { kind: 'notfound' }
  | { kind: 'error' };

// Keyed by slug so navigating between posts remounts and resets to loading
// without a synchronous setState in the effect.
const WritingPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  return <PostView key={slug ?? ''} slug={slug ?? ''} />;
};

const PostView: React.FC<{ slug: string }> = ({ slug }) => {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    fetchPost(slug)
      .then((post) => {
        if (active) setState(post ? { kind: 'ready', post } : { kind: 'notfound' });
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <PageTransition>
      <Page>
        <Inner>
          <BackLink to="/writing">← writing</BackLink>

          {state.kind === 'loading' && <Status><ShimmerText>Loading…</ShimmerText></Status>}
          {state.kind === 'notfound' && <Status>Post not found.</Status>}
          {state.kind === 'error' && <Status>Something went wrong.</Status>}

          {state.kind === 'ready' && (
            <RenderedPost
              template={state.post.template}
              title={state.post.title}
              coverImageUrl={state.post.coverImageUrl}
              publishedAt={state.post.publishedAt}
              body={state.post.body}
            />
          )}
        </Inner>
      </Page>
    </PageTransition>
  );
};

export default WritingPost;

const Page = styled.div`
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  padding: 6.5rem 0 5rem;
`;

const Inner = styled.div`
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 0 1.5rem;
`;

const BackLink = styled(Link)`
  display: inline-block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  text-decoration: none;
  margin-bottom: 3rem;

  &:hover {
    color: ${p => p.theme.color.ink};
  }
`;

const Status = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  color: ${p => p.theme.color.inkMuted};
`;
