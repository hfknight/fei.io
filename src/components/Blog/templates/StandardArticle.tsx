import styled from 'styled-components';
import type { TemplateProps } from './types';
import { formatDate } from './types';

// Standard article: a centered reading column with an optional cover image.
export default function StandardArticle({ title, coverImageUrl, publishedAt, children }: TemplateProps) {
  return (
    <Column>
      {publishedAt ? <DateLabel>{formatDate(publishedAt)}</DateLabel> : null}
      <Title>{title}</Title>
      {coverImageUrl ? <Cover src={coverImageUrl} alt="" loading="lazy" /> : null}
      {children}
    </Column>
  );
}

const Column = styled.article`
  max-width: 680px;
  margin: 0 auto;
`;

const DateLabel = styled.span`
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 1.2rem;
`;

const Title = styled.h1`
  color: #fff;
  font-size: clamp(2rem, 5vw, 2.9rem);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.01em;
  margin: 0 0 2rem;
`;

const Cover = styled.img`
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
  margin: 0 0 2.4rem;
`;
