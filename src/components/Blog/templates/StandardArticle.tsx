import styled from 'styled-components';
import type { TemplateProps } from './types';
import { formatDate } from './types';

// Standard article: a centered reading column with an optional cover image.
export default function StandardArticle({ title, coverImageUrl, publishedAt, children }: TemplateProps) {
  return (
    <Column>
      {publishedAt ? <DateLabel>{formatDate(publishedAt)}</DateLabel> : null}
      <Title>{title}</Title>
      <Rule />
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
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 1.2rem;
`;

const Title = styled.h1`
  color: ${p => p.theme.color.ink};
  font-family: ${p => p.theme.font.display};
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  font-weight: 400;
  line-height: 1.12;
  letter-spacing: -0.02em;
  margin: 0 0 1.4rem;
`;

const Rule = styled.hr`
  border: 0;
  border-top: 1px solid ${p => p.theme.color.border};
  width: 3rem;
  margin: 0 0 2.4rem;
`;

const Cover = styled.img`
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
  margin: 0 0 2.4rem;
`;
