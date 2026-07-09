import styled from 'styled-components';
import type { TemplateProps } from './types';
import { formatDate, isVideoUrl } from './types';

// Video-forward: the cover (image or video) is a hero above a reading column.
export default function VideoForward({ title, coverImageUrl, publishedAt, children }: TemplateProps) {
  return (
    <Wrap>
      {coverImageUrl ? (
        <Hero>
          {isVideoUrl(coverImageUrl) ? (
            <video src={coverImageUrl} controls playsInline preload="metadata" />
          ) : (
            <img src={coverImageUrl} alt="" loading="lazy" />
          )}
        </Hero>
      ) : null}
      <Column>
        {publishedAt ? <DateLabel>{formatDate(publishedAt)}</DateLabel> : null}
        <Title>{title}</Title>
        {children}
      </Column>
    </Wrap>
  );
}

const Wrap = styled.article``;

const Hero = styled.div`
  width: 100%;
  margin: 0 auto 2.4rem;
  border-radius: 12px;
  overflow: hidden;
  /* A well behind the media, not a surface. Letterboxing stays dark on any page. */
  background: #0c0a1f;

  video,
  img {
    display: block;
    width: 100%;
    height: auto;
  }
`;

const Column = styled.div`
  max-width: 680px;
  margin: 0 auto;
`;

const DateLabel = styled.span`
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 1.2rem;
`;

const Title = styled.h1`
  color: ${p => p.theme.color.ink};
  font-family: 'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: clamp(2.3rem, 5.5vw, 3.4rem);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0 0 1.8rem;
`;
