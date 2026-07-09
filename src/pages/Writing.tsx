import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import ShimmerText from '../components/ShimmerText';
import { fetchPublishedPosts } from '../lib/blogApi';
import { formatDate } from '../components/Blog/templates/types';
import type { BlogPostSummary } from '../types';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface State {
  loading: boolean;
  error: boolean;
  posts: BlogPostSummary[];
}

const Writing: React.FC = () => {
  const [state, setState] = useState<State>({ loading: true, error: false, posts: [] });

  useEffect(() => {
    let active = true;
    fetchPublishedPosts()
      .then((posts) => active && setState({ loading: false, error: false, posts }))
      .catch(() => active && setState({ loading: false, error: true, posts: [] }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageTransition>
      <Page>
        <Column>
          <Label
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            fei.hu / writing
          </Label>

          {state.loading && <Status><ShimmerText>Loading…</ShimmerText></Status>}
          {state.error && <Status>Couldn’t load posts.</Status>}
          {!state.loading && !state.error && state.posts.length === 0 && (
            <Status>No posts yet.</Status>
          )}

          <List>
            {state.posts.map((post, i) => (
              <Item
                key={post.id}
                initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease }}
              >
                <EntryLink to={`/writing/${post.slug}`}>
                  <Date>{formatDate(post.publishedAt)}</Date>
                  <EntryTitle>{post.title}</EntryTitle>
                </EntryLink>
              </Item>
            ))}
          </List>
        </Column>
      </Page>
    </PageTransition>
  );
};

export default Writing;

const Page = styled.div`
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 7rem 2rem 5rem;
`;

const Column = styled.div`
  max-width: 660px;
  width: 100%;
`;

const Label = styled(motion.span)`
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 3.5rem;
`;

const Status = styled.p`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 200;
  color: ${p => p.theme.color.inkMuted};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Item = styled(motion.li)`
  & + & {
    border-top: 1px solid ${p => p.theme.color.border};
  }
`;

const EntryLink = styled(Link)`
  display: block;
  text-decoration: none;
  padding: 1.6rem 0;

  &:hover h2 {
    color: var(--accent);
  }
`;

const Date = styled.span`
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 0.6rem;
`;

const EntryTitle = styled.h2`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 300;
  line-height: 1.2;
  color: ${p => p.theme.color.ink};
  margin: 0;
  transition: color 0.3s ease;
`;
