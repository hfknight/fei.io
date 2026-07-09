import styled, { css } from 'styled-components';
import type { TemplateProps } from './types';
import { formatDate } from './types';

// Photo essay: a full-bleed cover image leading the piece, narrower body.
export default function PhotoEssay({
  title,
  coverImageUrl,
  publishedAt,
  children,
  contained,
}: TemplateProps) {
  return (
    <Wrap>
      {coverImageUrl ? (
        <FullBleed $contained={contained}>
          <CoverImg src={coverImageUrl} alt="" />
          {/* DateLabel and Title are shared with the no-cover Header below, where they sit
              on the page. Here they sit on a dark scrim over the photo, so the overlay
              flips the surface and the same tokens resolve to white. */}
          <Overlay data-surface="inverted">
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

const FullBleed = styled.div<{ $contained?: boolean }>`
  position: relative;
  max-height: 70vh;
  overflow: hidden;
  ${(p) =>
    p.$contained
      ? css`
          width: 100%;
        `
      : css`
          width: 100vw;
          margin-left: 50%;
          transform: translateX(-50%);
        `}
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
  /* The scrim is cast over a photograph, so it stays the deep surface on any page. */
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
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 0.9rem;
`;

const Title = styled.h1`
  color: ${p => p.theme.color.ink};
  font-family: ${p => p.theme.font.display};
  font-size: clamp(2.8rem, 7vw, 4.4rem);
  font-weight: 400;
  line-height: 1.04;
  letter-spacing: -0.02em;
  margin: 0;
`;

const Body = styled.div`
  max-width: 620px;
  margin: 2.6rem auto 0;
`;
