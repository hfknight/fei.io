import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { listAllPosts, deletePost } from '../../lib/adminApi';
import ShimmerText from '../../components/ShimmerText';
import { formatDate } from '../../components/Blog/templates/types';
import type { BlogPost } from '../../types';

const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAllPosts()
      .then((p) => active && setPosts(p))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this post?')) return;
    await deletePost(id);
    setPosts((prev) => prev?.filter((p) => p.id !== id) ?? null);
  };

  return (
    <Page>
      <Bar>
        <Heading>Writing · Admin</Heading>
        <NewLink to="/writing/admin/new">New post</NewLink>
      </Bar>

      {error && <Status>Error: {error}</Status>}
      {!posts && !error && <Status><ShimmerText>Loading…</ShimmerText></Status>}
      {posts && posts.length === 0 && <Status>No posts yet.</Status>}

      <List>
        {posts?.map((post) => (
          <Row key={post.id}>
            <RowMain>
              <RowTitle to={`/writing/admin/${post.id}`}>{post.title || '(untitled)'}</RowTitle>
              <Meta>
                <Badge data-status={post.status}>{post.status}</Badge>
                <span>{formatDate(post.publishedAt ?? post.updatedAt)}</span>
                <Slug>/{post.slug}</Slug>
              </Meta>
            </RowMain>
            <Delete type="button" onClick={() => onDelete(post.id)}>
              Delete
            </Delete>
          </Row>
        ))}
      </List>
    </Page>
  );
};

export default AdminPosts;

const Page = styled.div`
  min-height: 100dvh;
  background: #12102a;
  color: rgba(255, 255, 255, 0.85);
  padding: 5rem 1.5rem;
  max-width: 820px;
  margin: 0 auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5rem;
`;

const Heading = styled.h1`
  font-size: 1rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 500;
  margin: 0;
`;

const NewLink = styled(Link)`
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-ink);
  background: var(--accent);
  padding: 0.55rem 0.95rem;
  border-radius: 6px;
  text-decoration: none;
`;

const Status = styled.p`
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.85rem;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const RowMain = styled.div`
  min-width: 0;
`;

const RowTitle = styled(Link)`
  display: block;
  color: #fff;
  font-size: 0.95rem;
  text-decoration: none;
  margin-bottom: 0.45rem;

  &:hover {
    color: var(--accent);
  }
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
`;

const Badge = styled.span`
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  &[data-status='published'] {
    color: #86efac;
    background: rgba(134, 239, 172, 0.12);
  }
  &[data-status='draft'] {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
`;

const Slug = styled.span`
  color: rgba(255, 255, 255, 0.3);
`;

const Delete = styled.button`
  flex-shrink: 0;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.6);
  font-family: inherit;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.45rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    border-color: rgba(248, 113, 113, 0.6);
    color: #fca5a5;
  }
`;
