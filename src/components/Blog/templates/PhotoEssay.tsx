import styled from 'styled-components';
import type { TemplateProps } from './types';
import { formatDate } from './types';

// Photo essay: a full-bleed cover image leading the piece, narrower body.
export default function PhotoEssay({ title, coverImageUrl, publishedAt, children }: TemplateProps) {
  return (
    <Wrap>
      {coverImageUrl ? (
        <FullBleed>
          <CoverImg src={coverImageUrl} alt="" />
          <Overlay>
            {publishedAt ? <DateLabel>{formatDate(publishedAt)}</DateLabel> : null}
            <Title>{title}</Title>
          </Overlay>
        </FullBleed>
      ) : (
        <Header>
          {publishedAt ? <DateLabel>{formatDate(publishedAt)}</DateLabel> : null}
          <Title>{title}</Title>
        </Header>
      )}
      <Body>{children}</Body>
    </Wrap>
  );
}

const Wrap = styled.article``;

const FullBleed = styled.div`
  position: relative;
  width: 100vw;
  margin-left: 50%;
  transform: translateX(-50%);
  max-height: 70vh;
  overflow: hidden;
`;

const CoverImg = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  max-height: 70vh;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 3rem 2rem;
  background: linear-gradient(transparent, rgba(18, 16, 42, 0.92));
  text-align: center;
`;

const Header = styled.div`
  max-width: 620px;
  margin: 0 auto 2.4rem;
  text-align: center;
`;

const DateLabel = styled.span`
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.9rem;
`;

const Title = styled.h1`
  color: #fff;
  font-size: clamp(2.1rem, 5.5vw, 3.2rem);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.015em;
  margin: 0;
`;

const Body = styled.div`
  max-width: 620px;
  margin: 2.6rem auto 0;
`;
