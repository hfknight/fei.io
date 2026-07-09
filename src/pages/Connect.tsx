import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { Linkedin, Github, Mail, ExternalLink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageTransition from '../components/PageTransition';

interface ContactLink {
  name: string;
  link: string;
  icon: string;
}

const iconMap: Record<string, LucideIcon> = {
  linkedin: Linkedin,
  github: Github,
  email: Mail,
};

const hintMap: Record<string, string> = {
  email: 'fei.hu@fei.io',
};

// The ambient glow that used to sit behind the links is gone. It was a lit haze in a dark
// room — a deep violet reading against #12102a. On grey paper there is no darkness for it
// to relieve, and at 10% alpha it rendered as a smudge.

const Page = styled.div`
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 7rem 2rem 5rem;
  position: relative;
  overflow: hidden;
`;

const Column = styled.div`
  max-width: 660px;
  width: 100%;
  position: relative;
  z-index: 1;
`;

const Label = styled(motion.span)`
  display: block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 3.5rem;
`;

const LinkRow = styled(motion.a)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 0;
  border-bottom: 1px solid ${p => p.theme.color.border};
  text-decoration: none;
  /* Resting is the muted weight and hover is the plain one, so the row still lifts on
     hover. Both alphas this replaced (0.75, 1.0) fall in the plain bucket, and mapping
     them literally would have collapsed the two states onto one colour. */
  color: ${p => p.theme.color.inkMuted};
  transition: color 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;

  &:first-of-type {
    border-top: 1px solid ${p => p.theme.color.border};
  }

  &:hover,
  &:focus-visible {
    color: ${p => p.theme.color.ink};
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 60%, transparent);
    border-radius: 2px;
  }

  &:hover .icon-wrap svg,
  &:focus-visible .icon-wrap svg {
    color: var(--accent);
  }

  &:hover .link-name,
  &:focus-visible .link-name {
    letter-spacing: 0.08em;
  }

  &:hover .hint-text,
  &:focus-visible .hint-text {
    opacity: 1;
    transform: translateY(0);
  }

  &:hover .ext-icon,
  &:focus-visible .ext-icon {
    opacity: 0.6;
    transform: translateX(0);
  }
`;

const LinkLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const IconWrap = styled.div`
  svg {
    transition: color 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    color: inherit;
    display: block;
  }
`;

const TextStack = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
`;

const LinkName = styled.span`
  font-family: ${p => p.theme.font.body};
  font-size: clamp(1.1rem, 2.5vw, 1.4rem);
  font-weight: 300;
  letter-spacing: 0.01em;
  transition: letter-spacing 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: block;
`;

const HintText = styled.span`
  position: absolute;
  top: calc(100% + 0.2rem);
  left: 0;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: ${p => p.theme.color.inkMuted};
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
`;

const ExtIcon = styled.div`
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
`;

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const Contact: React.FC = () => {
  const [links, setLinks] = useState<ContactLink[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    fetch('/data/portfolio.json')
      .then(r => r.json())
      .then(data => setLinks(data.contact?.links ?? []));
  }, []);

  return (
    <PageTransition>
    <Page>
      <Column>
        <Label
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0.1 : 0.6, ease: 'easeOut' }}
        >
          fei.hu / connect
        </Label>

        {links.map((item, i) => {
          const Icon = iconMap[item.icon] ?? ExternalLink;
          const hint = hintMap[item.icon];
          return (
            <LinkRow
              key={item.name}
              href={item.link}
              target={item.icon !== 'email' ? '_blank' : undefined}
              rel={item.icon !== 'email' ? 'noopener noreferrer' : undefined}
              initial={{ opacity: 0, y: reduced ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.1 : 0.8, delay: reduced ? 0 : 0.2 + i * 0.12, ease }}
              whileHover={reduced ? {} : { x: 6 }}
            >
              <LinkLeft>
                <IconWrap className="icon-wrap" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.5} />
                </IconWrap>
                <TextStack>
                  <LinkName className="link-name">{item.name}</LinkName>
                  {hint && <HintText className="hint-text">{hint}</HintText>}
                </TextStack>
              </LinkLeft>
              <ExtIcon className="ext-icon" aria-hidden="true">
                <ExternalLink size={14} strokeWidth={1.5} />
              </ExtIcon>
            </LinkRow>
          );
        })}
      </Column>
    </Page>
    </PageTransition>
  );
};

export default Contact;
