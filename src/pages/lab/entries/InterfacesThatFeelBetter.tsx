import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Copy, Check, Settings, Bell } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import cssLang from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import PageTransition from '../../../components/PageTransition';

hljs.registerLanguage('css', cssLang);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];
const spring = [0.2, 0, 0, 1] as [number, number, number, number];

const ARTICLE_URL = 'https://jakub.kr/writing/details-that-make-interfaces-feel-better';
const SKILL_URL = 'https://github.com/jakubkrehel/make-interfaces-feel-better';
const TRANSITIONS_URL = 'https://transitions.dev';
const TRANSITIONS_SKILL_URL = 'https://github.com/Jakubantalik/transitions.dev';
const EMIL_URL = 'https://emilkowal.ski/ui/7-practical-animation-tips';
const EMIL_SKILL_URL = 'https://emilkowal.ski/skill';

const CARD_SHADOW =
  '0 0 0 1px rgba(255,255,255,0.10), 0 2px 8px rgba(0,0,0,0.35), 0 10px 30px rgba(0,0,0,0.25)';

/* ------------------------------------------------------------------ */
/* Reusable controls                                                   */
/* ------------------------------------------------------------------ */

const Btn: React.FC<{
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ on, onClick, children }) => (
  <PressButton type="button" $on={!!on} onClick={onClick} whileTap={{ scale: 0.96 }}>
    {children}
  </PressButton>
);

const Slider: React.FC<{
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
}> = ({ label, min, max, value, onChange }) => (
  <SliderRow>
    <SliderLabel>{label}</SliderLabel>
    <Range
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </SliderRow>
);

const CodeDisclosure: React.FC<{ code: string; lang: 'css' | 'javascript' }> = ({ code, lang }) => {
  const [open, setOpen] = useState(false);
  const html = hljs.highlight(code, { language: lang }).value;
  return (
    <div>
      <DiscBtn type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? '− hide code' : '+ show code'}
      </DiscBtn>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease }}
            style={{ overflow: 'hidden' }}
          >
            <Code>
              {/* hljs escapes the input, and the source is a static literal — safe to inject. */}
              <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
            </Code>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Demos                                                               */
/* ------------------------------------------------------------------ */

const TypographyDemo: React.FC = () => {
  const [tabular, setTabular] = useState(true);
  const [balance, setBalance] = useState(true);
  const [value, setValue] = useState(8421.37);

  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => Math.round((v + (Math.random() * 600 - 200)) * 100) / 100);
    }, 650);
    return () => clearInterval(id);
  }, []);

  return (
    <DemoCard>
      <DemoCaption>Watch the trailing label as the number updates — then toggle tabular-nums.</DemoCaption>
      <NumRow>
        <NumValue $tabular={tabular}>
          {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </NumValue>
        <NumUnit>pts / sec</NumUnit>
      </NumRow>
      <Btn on={tabular} onClick={() => setTabular((t) => !t)}>
        tabular-nums {tabular ? 'on' : 'off'}
      </Btn>

      <Divider />

      <DemoCaption>A heading constrained to a narrow column — toggle balanced wrapping.</DemoCaption>
      <SampleHeading $balance={balance}>
        A headline that is long enough to wrap onto a second line
      </SampleHeading>
      <Btn on={balance} onClick={() => setBalance((b) => !b)}>
        text-wrap: balance {balance ? 'on' : 'off'}
      </Btn>
    </DemoCard>
  );
};

const SurfacesDemo: React.FC = () => {
  const [outer, setOuter] = useState(28);
  const [pad, setPad] = useState(12);
  const [useShadow, setUseShadow] = useState(true);
  const inner = Math.max(0, outer - pad);

  return (
    <DemoCard>
      <DemoCaption>Drag the sliders. The inner radius follows automatically: outer = inner + padding.</DemoCaption>
      <RadiusStage>
        <OuterBox
          style={{
            borderRadius: outer,
            padding: pad,
            boxShadow: useShadow ? CARD_SHADOW : 'none',
            border: useShadow ? '1px solid transparent' : '1px solid rgba(255,255,255,0.3)',
          }}
        >
          <InnerBox style={{ borderRadius: inner }} />
        </OuterBox>
      </RadiusStage>
      <Slider label={`outer ${outer}px`} min={8} max={48} value={outer} onChange={setOuter} />
      <Slider label={`padding ${pad}px`} min={0} max={28} value={pad} onChange={setPad} />
      <Readout>
        inner = {inner}px <Faint>(outer − padding)</Faint>
      </Readout>
      <Btn on={useShadow} onClick={() => setUseShadow((s) => !s)}>
        surface: {useShadow ? 'shadow' : 'border'}
      </Btn>
    </DemoCard>
  );
};

const STAGGER_ITEMS = ['A staggered title', 'A line of description text', 'Primary action'];

const AnimationsDemo: React.FC = () => {
  const [replayKey, setReplayKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [subtleExit, setSubtleExit] = useState(true);
  const [chips, setChips] = useState(['alpha', 'beta', 'gamma']);
  const [fromZero, setFromZero] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [originTrigger, setOriginTrigger] = useState(true);

  const copy = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <DemoCard>
      <DemoCaption>Replay the staggered entrance — each chunk eases in ~100ms after the last.</DemoCaption>
      <StaggerStage key={replayKey}>
        {STAGGER_ITEMS.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, delay: i * 0.1, ease: spring }}
          >
            {i === 2 ? <FakeButton>{item}</FakeButton> : <StaggerLine $title={i === 0}>{item}</StaggerLine>}
          </motion.div>
        ))}
      </StaggerStage>
      <Btn on={false} onClick={() => setReplayKey((k) => k + 1)}>
        ↻ replay
      </Btn>

      <Divider />

      <DemoCaption>Press the button — the icon swaps on a spring, and the whole thing dips to 0.96.</DemoCaption>
      <PressButton type="button" $on={copied} onClick={copy} whileTap={{ scale: 0.96 }}>
        <IconSlot>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={copied ? 'check' : 'copy'}
              initial={{ scale: 0.25, opacity: 0, filter: 'blur(4px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.25, opacity: 0, filter: 'blur(4px)' }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
              style={{ display: 'inline-flex' }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </motion.span>
          </AnimatePresence>
        </IconSlot>
        {copied ? 'Copied' : 'Copy'}
      </PressButton>

      <Divider />

      <DemoCaption>Remove a chip and compare exit styles: subtle blur-up vs. a full slide-out.</DemoCaption>
      <ChipRow>
        <AnimatePresence>
          {chips.map((chip) => (
            <motion.button
              type="button"
              key={chip}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={subtleExit ? { opacity: 0, y: -8, filter: 'blur(4px)' } : { opacity: 0, x: -70 }}
              transition={{ duration: 0.22, ease }}
              onClick={() => setChips((cs) => cs.filter((c) => c !== chip))}
              style={chipStyle}
            >
              {chip} ×
            </motion.button>
          ))}
        </AnimatePresence>
      </ChipRow>
      <ButtonRow>
        <Btn on={subtleExit} onClick={() => setSubtleExit((s) => !s)}>
          exit: {subtleExit ? 'subtle' : 'full'}
        </Btn>
        <Btn on={false} onClick={() => setChips(['alpha', 'beta', 'gamma'])}>
          reset
        </Btn>
      </ButtonRow>

      <Divider />

      <DemoCaption>Pop a card in. From scale(0) it balloons through the layout; from 0.9 it just settles.</DemoCaption>
      <PopCardStage>
        <PopCard
          key={popKey}
          initial={{ opacity: 0, scale: fromZero ? 0 : 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
        >
          Card
        </PopCard>
      </PopCardStage>
      <ButtonRow>
        <Btn
          on={fromZero}
          onClick={() => {
            setFromZero((f) => !f);
            setPopKey((k) => k + 1);
          }}
        >
          from: scale({fromZero ? '0' : '0.9'})
        </Btn>
        <Btn on={false} onClick={() => setPopKey((k) => k + 1)}>
          replay
        </Btn>
      </ButtonRow>

      <Divider />

      <DemoCaption>
        Open the menu, then switch where it scales from. Origin at the trigger feels attached; from center it
        feels detached.
      </DemoCaption>
      <OriginControls>
        <Btn on={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          {menuOpen ? 'close menu' : 'open menu'}
        </Btn>
        <Btn on={false} onClick={() => setOriginTrigger((t) => !t)}>
          origin: {originTrigger ? 'trigger' : 'center'}
        </Btn>
      </OriginControls>
      <OriginStage>
        <AnimatePresence>
          {menuOpen && (
            <Popover
              $trigger={originTrigger}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.18, ease }}
            >
              <PopItem>Profile</PopItem>
              <PopItem>Settings</PopItem>
              <PopItem>Sign out</PopItem>
            </Popover>
          )}
        </AnimatePresence>
      </OriginStage>
    </DemoCard>
  );
};

const PerformanceDemo: React.FC = () => {
  const [reveal, setReveal] = useState(false);

  return (
    <DemoCard>
      <DemoCaption>The icon is 18px, but its tap target is 40 × 40. Reveal it, then hover the empty space around the icon.</DemoCaption>
      <HitStage>
        <HitButton type="button" $reveal={reveal} aria-label="settings">
          <Settings size={18} />
        </HitButton>
      </HitStage>
      <Btn on={reveal} onClick={() => setReveal((r) => !r)}>
        {reveal ? 'hide hit area' : 'reveal hit area'}
      </Btn>

      <Divider />

      <DemoCaption>Hover both. “all” animates padding + color and lurches; the specific one only scales.</DemoCaption>
      <CompareRow>
        <AllBtn type="button">transition: all</AllBtn>
        <SpecificBtn type="button">specific</SpecificBtn>
      </CompareRow>
    </DemoCard>
  );
};

const TABS = ['Overview', 'Specs', 'Reviews'];

const TransitionsDemo: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [shakeVal, setShakeVal] = useState('');
  const [shaking, setShaking] = useState(false);
  const [count, setCount] = useState(0);
  const [num, setNum] = useState(1240);

  const submit = () => {
    if (shakeVal.trim()) return;
    setShaking(true);
  };

  return (
    <DemoCard>
      <DemoCaption>Sliding tabs — the pill eases to the active tab.</DemoCaption>
      <TabBar>
        {TABS.map((t, i) => (
          <TabBtn key={t} type="button" onClick={() => setTab(i)} $active={tab === i}>
            {tab === i && (
              <Pill layoutId="t-pill" transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} />
            )}
            <TabText>{t}</TabText>
          </TabBtn>
        ))}
      </TabBar>

      <Divider />

      <DemoCaption>Accordion — grid rows animate from 0fr to 1fr (height: auto can’t).</DemoCaption>
      <AccHeader type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Why animate grid rows?
        <Chevron $open={open}>⌄</Chevron>
      </AccHeader>
      <AccPanel $open={open}>
        <AccClip>
          <AccBody>
            CSS can’t transition height to auto — but it can transition a grid track from 0fr to
            1fr, so the panel grows to exactly its content height.
          </AccBody>
        </AccClip>
      </AccPanel>

      <Divider />

      <DemoCaption>Tooltip — hover the chip: it waits 80ms to appear, then leaves instantly.</DemoCaption>
      <TipWrap>
        <TipTarget>hover me</TipTarget>
        <Tip>Delayed in, instant out</Tip>
      </TipWrap>

      <Divider />

      <DemoCaption>Error shake — submit while empty to feel the nudge.</DemoCaption>
      <ShakeRow>
        <ShakeInput
          value={shakeVal}
          onChange={(e) => setShakeVal(e.target.value)}
          placeholder="type something"
          $shaking={shaking}
          $error={shaking}
          onAnimationEnd={() => setShaking(false)}
        />
        <PressButton type="button" $on={false} onClick={submit} whileTap={{ scale: 0.96 }}>
          submit
        </PressButton>
      </ShakeRow>

      <Divider />

      <DemoCaption>Notification badge — diagonal slide + spring pop.</DemoCaption>
      <BadgeRow>
        <BellWrap>
          <Bell size={22} />
          <AnimatePresence>
            {count > 0 && (
              <Badge
                initial={{ scale: 0, x: -10, y: 10, opacity: 0 }}
                animate={{ scale: 1, x: 0, y: 0, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.34, 1.36, 0.64, 1] }}
              >
                {count}
              </Badge>
            )}
          </AnimatePresence>
        </BellWrap>
        <PressButton
          type="button"
          $on={false}
          onClick={() => setCount((c) => Math.min(c + 1, 9))}
          whileTap={{ scale: 0.96 }}
        >
          notify
        </PressButton>
        <PressButton type="button" $on={false} onClick={() => setCount(0)} whileTap={{ scale: 0.96 }}>
          clear
        </PressButton>
      </BadgeRow>

      <Divider />

      <DemoCaption>Number pop-in — each digit slides in with a hint of blur, staggered ~40ms.</DemoCaption>
      <PopRow key={num}>
        {num.toLocaleString().split('').map((d, i) => (
          <Digit
            key={i}
            initial={{ y: '-70%', opacity: 0, filter: 'blur(2px)' }}
            animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.25, delay: i * 0.04, ease: 'easeInOut' }}
          >
            {d}
          </Digit>
        ))}
      </PopRow>
      <PressButton
        type="button"
        $on={false}
        onClick={() => setNum((v) => v + Math.floor(Math.random() * 900 + 100))}
        whileTap={{ scale: 0.96 }}
      >
        + add
      </PressButton>
    </DemoCard>
  );
};

const DEMOS: Record<string, React.FC> = {
  Typography: TypographyDemo,
  Surfaces: SurfacesDemo,
  Animations: AnimationsDemo,
  Performance: PerformanceDemo,
  Transitions: TransitionsDemo,
};

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

interface Tip {
  name: string;
  body: string;
  keys: string[];
  lang: 'css' | 'javascript';
  code: string;
}

interface Group {
  title: string;
  blurb: string;
  tips: Tip[];
}

const GROUPS: Group[] = [
  {
    title: 'Typography',
    blurb: 'How text reads, holds still, and balances.',
    tips: [
      {
        name: 'Balanced headings, tidy paragraphs',
        keys: ['text-wrap: balance', 'text-wrap: pretty'],
        body: 'Even out short headings so no single word drops to its own line, and stop body copy from ending on a lonely orphan. Two broad, one-line rules.',
        lang: 'css',
        code: `/* Even headings; no orphaned words in body copy */
h1, h2, h3        { text-wrap: balance; }
p, li, blockquote { text-wrap: pretty; }`,
      },
      {
        name: 'Crisp text on macOS',
        keys: ['-webkit-font-smoothing: antialiased', '-moz-osx-font-smoothing: grayscale'],
        body: 'macOS renders text a touch heavy by default. Antialiased font smoothing makes light text thinner and sharper — set it once at the root.',
        lang: 'css',
        code: `/* Set once at the root */
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`,
      },
      {
        name: 'Tabular numbers',
        keys: ['font-variant-numeric: tabular-nums'],
        body: 'When a number updates live — a timer, a price, a count — fixed-width digits stop the layout from jittering as the glyphs change.',
        lang: 'css',
        code: `/* Equal-width digits for live values */
.counter { font-variant-numeric: tabular-nums; }`,
      },
    ],
  },
  {
    title: 'Surfaces',
    blurb: 'Depth, edges, and the alignment your eye expects.',
    tips: [
      {
        name: 'Concentric border radius',
        keys: ['border-radius', 'outer = inner + padding'],
        body: 'Nested corners should share a center: outer radius = inner radius + padding. Mismatched radii are the single most common thing that makes a card feel subtly off.',
        lang: 'css',
        code: `/* outer radius = inner radius + padding */
.card       { border-radius: 20px; padding: 8px; }  /* 12 + 8 */
.card-inner { border-radius: 12px; }`,
      },
      {
        name: 'Shadows instead of borders',
        keys: ['box-shadow (stacked)', 'transition-property: box-shadow'],
        body: 'A stacked, low-opacity shadow gives depth and sits correctly on any background, where a solid 1px border breaks the moment the background color shifts.',
        lang: 'css',
        code: `/* Depth on any background — stack shadows, not a border */
.card {
  box-shadow:
    0 0 0 1px   rgba(0, 0, 0, 0.06),
    0 1px 2px -1px rgba(0, 0, 0, 0.06),
    0 2px 4px 0    rgba(0, 0, 0, 0.04);
  transition-property: box-shadow;
}`,
      },
      {
        name: 'Outline your images',
        keys: ['outline: 1px', 'outline-offset: -1px'],
        body: 'A 1px outline at ~10% opacity, offset inward, gives images a consistent edge that matches bordered UI around them — most useful inside a design system.',
        lang: 'css',
        code: `/* Consistent inset edge on images */
img { outline: 1px solid rgba(0, 0, 0, 0.1); outline-offset: -1px; }`,
      },
      {
        name: 'Optical over geometric alignment',
        keys: ['padding-left ≠ padding-right'],
        body: 'Trust the eye over the math: trim a few pixels where a shape leans — the padding beside an icon, a play triangle — even when it is technically centered.',
        lang: 'css',
        code: `/* Trim the icon side a touch */
.button-with-icon { padding-left: 16px; padding-right: 14px; }`,
      },
    ],
  },
  {
    title: 'Animations',
    blurb: 'The motion primitives — the rules behind making any animation feel right.',
    tips: [
      {
        name: 'Make animations interruptible',
        keys: ['transition', '@keyframes'],
        body: 'CSS transitions retarget to the latest state mid-flight; keyframes restart from zero and feel broken when a user changes their mind. Use transitions for interactive state, keyframes only for one-shot sequences.',
        lang: 'css',
        code: `/* Transitions retarget; keyframes restart */
.drawer { transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1); }`,
      },
      {
        name: 'Split and stagger entrances',
        keys: ['opacity', 'translateY', 'blur', 'animation-delay'],
        body: 'Animate semantic chunks — title, then copy, then buttons — with ~100ms offsets, combining opacity, a small translateY, and a hint of blur. Far better than fading one big block in.',
        lang: 'css',
        code: `@keyframes enter {
  from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
.item {
  animation: enter 0.4s cubic-bezier(0.2, 0, 0, 1) both;
  animation-delay: calc(var(--i) * 100ms);
}`,
      },
      {
        name: 'Keep exits subtle',
        keys: ['opacity', 'translateY'],
        body: 'An element leaving should not demand attention. A small fixed translateY over ~150ms reads softer than sliding the whole thing off-screen.',
        lang: 'javascript',
        code: `// Small fixed translateY, not the full height
<motion.div exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.15 }} />`,
      },
      {
        name: 'Don’t animate from scale(0)',
        keys: ['initial scale ~0.9', 'not 0'],
        body: 'Scaling an entrance up from 0 balloons the element through the layout and reads as rubbery. Start around 0.9 — the eye sees a settle, not a zoom.',
        lang: 'javascript',
        code: `// Settle in from 0.9, never from 0
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ type: "spring", duration: 0.4, bounce: 0.25 }}
/>`,
      },
      {
        name: 'Animate icon swaps',
        keys: ['scale', 'opacity', 'blur', 'spring'],
        body: 'On a state change, cross-fade the icons with scale 0.25 → 1, opacity 0 → 1, and blur 4px → 0. A spring (duration 0.3, no bounce) makes the swap feel responsive. A 15px icon is small enough to pop from a low scale — the ~0.9 floor above is for full panels and cards.',
        lang: 'javascript',
        code: `<AnimatePresence initial={false} mode="popLayout">
  <motion.span
    key={copied ? "check" : "copy"}
    initial={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
    animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
    exit={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
  >
    {copied ? <CheckIcon /> : <CopyIcon />}
  </motion.span>
</AnimatePresence>`,
      },
      {
        name: 'Scale on press',
        keys: ['scale(0.96)'],
        body: 'scale(0.96) on the active state gives a button real tactile feedback. Never go below ~0.95 — past that it reads as a glitch.',
        lang: 'css',
        code: `/* Tactile press — never below ~0.95 */
.button:active { scale: 0.96; }`,
      },
      {
        name: 'Scale from the trigger, not the center',
        keys: ['transform-origin', 'grow from the trigger'],
        body: 'A popover should grow out of the control that opened it. Point transform-origin at the trigger — menu libraries hand you its position as a CSS variable — so the panel feels attached instead of ballooning from its own middle.',
        lang: 'css',
        code: `/* Grow from the trigger, not the panel’s middle */
.menu {
  /* the menu lib reports where the trigger sits */
  transform-origin: var(--radix-dropdown-menu-content-transform-origin);
  transition: opacity 150ms ease-out, scale 150ms ease-out;
}`,
      },
      {
        name: 'Skip the animation on first paint',
        keys: ['initial={false}'],
        body: 'Toggles should not animate when the page first loads. initial={false} on AnimatePresence keeps the first render still.',
        lang: 'javascript',
        code: `// No animation on the first render
<AnimatePresence initial={false}>{children}</AnimatePresence>`,
      },
    ],
  },
  {
    title: 'Performance',
    blurb: 'Keeping motion cheap to render and easy to reach.',
    tips: [
      {
        name: 'Never transition: all',
        keys: ['transition-property: scale, opacity', 'never transition: all'],
        body: 'Name the exact properties you animate. transition: all (and Tailwind’s bare transition) sweeps in colors, padding and shadows you did not mean to move, and blocks browser optimizations.',
        lang: 'css',
        code: `/* Name the properties — never transition: all */
.button {
  transition-property: scale, background-color;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}`,
      },
      {
        name: 'will-change, sparingly',
        keys: ['will-change: transform, opacity, filter'],
        body: 'Hint the GPU only for compositable properties — transform, opacity, filter — and only once you actually see first-frame stutter (Safari benefits most). Never will-change: all.',
        lang: 'css',
        code: `/* Compositable props only, and only when you see stutter */
.animated-card { will-change: transform, opacity; }`,
      },
      {
        name: '40 × 40 minimum hit area',
        keys: ['min 40 × 40px', '::before'],
        body: 'Interactive targets need at least 40 × 40px. Grow a small visible control with a pseudo-element instead of scaling the icon up, and do not let neighboring hit areas overlap.',
        lang: 'css',
        code: `/* Grow the hit area without growing the icon */
.icon-button { position: relative; }
.icon-button::before {
  content: "";
  position: absolute;
  inset: 50%;
  width: 40px;
  height: 40px;
  transform: translate(-50%, -50%);
}`,
      },
    ],
  },
  {
    title: 'Transitions',
    blurb: 'Named component patterns — recipes assembled from those primitives.',
    tips: [
      {
        name: 'Sliding tabs',
        body: 'A single pill indicator slides to the active tab. Write the active tab’s position and width to CSS variables and transition the transform — and skip the transition on first paint so it doesn’t animate in from the origin.',
        keys: ['transform: translateX', 'width', 'cubic-bezier(0.22, 1, 0.36, 1)'],
        lang: 'css',
        code: `/* Pill follows the active tab */
.pill {
  transform: translateX(var(--shift));
  width: var(--width);
  transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
}`,
      },
      {
        name: 'Accordion',
        body: 'You can’t transition height to auto, but you can transition a grid track. Animate grid-template-rows from 0fr to 1fr and the panel grows to exactly its content height; flip the chevron with scaleY(-1) to dodge path-morph bugs.',
        keys: ['grid-template-rows: 0fr → 1fr', 'transform: scaleY(-1)'],
        lang: 'css',
        code: `/* Animate the grid track, not height */
.panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 400ms ease; }
.panel[data-open] { grid-template-rows: 1fr; }
.panel > * { overflow: hidden; min-height: 0; }
.chevron[data-open] { transform: scaleY(-1); }`,
      },
      {
        name: 'Tooltip',
        body: 'Delay the tooltip ~80ms on enter so a cursor passing through doesn’t flash it, and remove the delay on exit so it dismisses the instant you leave. Once one tooltip in a group has opened, drop the delay on the rest — a warm group should feel instant, not re-charge 80ms at every target.',
        keys: ['transition-delay: 80ms', 'instant when warm', 'scale: 0.98'],
        lang: 'css',
        code: `/* Delay in, instant out */
.tip {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
.target:hover .tip { opacity: 1; transform: none; transition-delay: 80ms; }
/* group already warm — skip the wait on the next tip */
.target:hover .tip[data-instant] { transition-delay: 0ms; }`,
      },
      {
        name: 'Error shake',
        body: 'A short left/right shake says “try again” without a word. Keep the shake on its own class so you can replay it — remove it, force a reflow, then re-add.',
        keys: ['@keyframes shake', 'translateX ±8px', 'cubic-bezier'],
        lang: 'css',
        code: `@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}
.input.is-shaking { animation: shake 450ms cubic-bezier(0.36, 0.07, 0.19, 0.97); }`,
      },
      {
        name: 'Notification badge',
        body: 'Combine a diagonal slide-in with a spring scale so a new badge feels alive rather than just appearing — a bounce easing sells the pop.',
        keys: ['translate', 'scale', 'cubic-bezier(0.34, 1.36, 0.64, 1)'],
        lang: 'css',
        code: `/* Diagonal slide + spring pop */
.badge { transform: translate(-30px, 30px) scale(0); transition: transform 500ms cubic-bezier(0.34, 1.36, 0.64, 1); }
.badge[data-on] { transform: translate(0, 0) scale(1); }`,
      },
      {
        name: 'Number pop-in',
        body: 'When a value changes, let each digit slide in with a touch of blur, staggered ~40ms apart, instead of snapping to the new number.',
        keys: ['translateY', 'blur(2px)', 'stagger 40ms'],
        lang: 'css',
        code: `@keyframes pop {
  from { transform: translateY(-70%); opacity: 0; filter: blur(2px); }
  to   { transform: translateY(0);    opacity: 1; filter: blur(0); }
}
.digit { animation: pop 250ms ease-in-out both; animation-delay: calc(var(--i) * 40ms); }`,
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const SECTION_IDS = [...GROUPS.map((g) => g.title.toLowerCase()), 'references'];

const InterfacesThatFeelBetter: React.FC = () => {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay } }
      : {
          initial: { opacity: 0, y: 18, filter: 'blur(6px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: 0.9, delay, ease },
        };

  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = SECTION_IDS.indexOf(entry.target.id);
            if (idx >= 0) setActive(idx);
          }
        });
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const goTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });

  return (
    <PageTransition>
      <Page>
        <Shell>
          <SideNav aria-label="Sections">
            <SideInner>
              <SideLabel>Sections</SideLabel>
              <SideList>
                {GROUPS.map((group, i) => (
                  <li key={group.title}>
                    <SideItem
                      type="button"
                      $active={active === i}
                      onClick={() => goTo(group.title.toLowerCase())}
                    >
                      <SideIdx $active={active === i}>{String(i + 1).padStart(2, '0')}</SideIdx>
                      {group.title}
                    </SideItem>
                  </li>
                ))}
                <li key="references">
                  <SideItem
                    type="button"
                    $active={active === GROUPS.length}
                    onClick={() => goTo('references')}
                  >
                    <SideIdx $active={active === GROUPS.length}>
                      {String(GROUPS.length + 1).padStart(2, '0')}
                    </SideIdx>
                    References
                  </SideItem>
                </li>
              </SideList>
            </SideInner>
          </SideNav>

          <Main>
            <Kicker
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              fei.hu / <Crumb to="/lab">lab</Crumb> / interfaces that feel better
            </Kicker>

            <Title {...rise(0.1)}>Best practices that make interfaces feel better</Title>

            <Lede {...rise(0.2)}>
              Great interfaces are a collection of small things that compound into a great
              experience. Here are twenty-four of those details — across typography, surfaces,
              animation, performance, and transitions, each one playable.
            </Lede>

            <Credit {...rise(0.27)}>
              Adapted from{' '}
              <A href={ARTICLE_URL} target="_blank" rel="noreferrer noopener">
                Details that make interfaces feel better
              </A>{' '}
              and the{' '}
              <A href={SKILL_URL} target="_blank" rel="noreferrer noopener">
                make-interfaces-feel-better
              </A>{' '}
              skill by Jakub Krehel, with transitions from{' '}
              <A href={TRANSITIONS_URL} target="_blank" rel="noreferrer noopener">
                transitions.dev
              </A>{' '}
              by Jakub Antalik, plus animation tips from{' '}
              <A href={EMIL_URL} target="_blank" rel="noreferrer noopener">
                Emil Kowalski
              </A>
              .
            </Credit>

            {GROUPS.map((group, i) => {
              const Demo = DEMOS[group.title];
              return (
                <GroupBlock
                  key={group.title}
                  id={group.title.toLowerCase()}
                  {...rise(0.34 + i * 0.06)}
                >
                  <GroupHead>
                    <GroupTitleRow>
                      <Idx>{String(i + 1).padStart(2, '0')}</Idx>
                      <GroupTitle>{group.title}</GroupTitle>
                    </GroupTitleRow>
                    <GroupBlurb>{group.blurb}</GroupBlurb>
                  </GroupHead>

                  <TipList>
                    {group.tips.map((tip) => (
                      <TipItem key={tip.name}>
                        <TipName>{tip.name}</TipName>
                        <TipBody>{tip.body}</TipBody>
                        <KeyTags>
                          {tip.keys.map((k) => (
                            <KeyTag key={k}>{k}</KeyTag>
                          ))}
                        </KeyTags>
                        <CodeDisclosure code={tip.code} lang={tip.lang} />
                      </TipItem>
                    ))}
                  </TipList>

                  <DemoCol>
                    <Demo />
                  </DemoCol>
                </GroupBlock>
              );
            })}

            <RefSection id="references" {...rise(0.34)}>
              <RefHead>
                <GroupTitleRow>
                  <Idx>{String(GROUPS.length + 1).padStart(2, '0')}</Idx>
                  <GroupTitle>References</GroupTitle>
                </GroupTitleRow>
                <GroupBlurb>The sources these details come from — and the agent skills you can install.</GroupBlurb>
              </RefHead>

              <RefList>
                <RefGroup>
                  <RefEntry>
                    <RefLine>
                      <A href={ARTICLE_URL} target="_blank" rel="noreferrer noopener">
                        Details that make interfaces feel better
                      </A>
                      <RefMeta>Article by Jakub Krehel</RefMeta>
                    </RefLine>
                  </RefEntry>
                  <RefEntry>
                    <RefLine>
                      <A href={SKILL_URL} target="_blank" rel="noreferrer noopener">
                        make-interfaces-feel-better
                      </A>
                      <RefMeta>Agent skill by Jakub Krehel</RefMeta>
                    </RefLine>
                    <RefInstall>npx skills add jakubkrehel/make-interfaces-feel-better</RefInstall>
                  </RefEntry>
                </RefGroup>
                <RefGroup>
                  <RefEntry>
                    <RefLine>
                      <A href={TRANSITIONS_URL} target="_blank" rel="noreferrer noopener">
                        transitions.dev
                      </A>
                      <RefMeta>Interactive transitions collection by Jakub Antalik</RefMeta>
                    </RefLine>
                  </RefEntry>
                  <RefEntry>
                    <RefLine>
                      <A href={TRANSITIONS_SKILL_URL} target="_blank" rel="noreferrer noopener">
                        transitions.dev skill
                      </A>
                      <RefMeta>Agent skill by Jakub Antalik</RefMeta>
                    </RefLine>
                    <RefInstall>npx skills add Jakubantalik/transitions.dev</RefInstall>
                  </RefEntry>
                </RefGroup>
                <RefGroup>
                  <RefEntry>
                    <RefLine>
                      <A href={EMIL_URL} target="_blank" rel="noreferrer noopener">
                        7 practical animation tips
                      </A>
                      <RefMeta>Article by Emil Kowalski</RefMeta>
                    </RefLine>
                  </RefEntry>
                  <RefEntry>
                    <RefLine>
                      <A href={EMIL_SKILL_URL} target="_blank" rel="noreferrer noopener">
                        emil-design-eng
                      </A>
                      <RefMeta>Agent skill by Emil Kowalski</RefMeta>
                    </RefLine>
                    <RefInstall>npx skills add emilkowalski/skill</RefInstall>
                  </RefEntry>
                </RefGroup>
              </RefList>
            </RefSection>
          </Main>
        </Shell>
      </Page>
    </PageTransition>
  );
};

export default InterfacesThatFeelBetter;

/* ------------------------------------------------------------------ */
/* Inline style object (CSSProperties-typed, dynamic values)           */
/* ------------------------------------------------------------------ */

const chipStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.72rem',
  letterSpacing: '0.04em',
  color: 'rgba(255,255,255,0.75)',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 999,
  padding: '0.4rem 0.8rem',
  cursor: 'pointer',
};

/* ------------------------------------------------------------------ */
/* Styled — page                                                       */
/* ------------------------------------------------------------------ */

const Page = styled.div`
  min-height: 100dvh;
  background: #12102a;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 6.5rem 2rem 6rem;

  /* On desktop, scroll inside Page so the sticky section nav and preview
     resolve against a container that actually scrolls (the #root wrapper has
     overflow-x: hidden, which otherwise traps position: sticky). */
  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    height: 100dvh;
    overflow-y: auto;
    overflow-x: hidden;
  }
`;

const Shell = styled.div`
  width: 100%;
  max-width: 760px;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    max-width: 1200px;
    display: flex;
    align-items: flex-start;
    gap: 4rem;
  }
`;

const SideNav = styled.nav`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: block;
    width: 150px;
    flex-shrink: 0;
    position: sticky;
    top: 8rem;
  }
`;

const SideInner = styled.div``;

const SideLabel = styled.span`
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.58rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 1.2rem;
`;

const SideList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const SideItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.92rem;
  font-weight: 300;
  color: ${(p) => (p.$active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)')};
  transition: color 0.25s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.85);
  }

  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 3px;
    border-radius: 4px;
  }
`;

const SideIdx = styled.span<{ $active: boolean }>`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.62rem;
  color: ${(p) => (p.$active ? 'color-mix(in srgb, var(--accent) 90%, transparent)' : 'rgba(255,255,255,0.3)')};
  transition: color 0.25s ease;
`;

const Main = styled.div`
  width: 100%;
  min-width: 0;
`;

const Crumb = styled(Link)`
  color: inherit;
  text-decoration: none;
  transition: color 0.25s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 3px;
    border-radius: 3px;
  }
`;

const Kicker = styled(motion.span)`
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2.5rem;
`;

const Title = styled(motion.h1)`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  font-weight: 300;
  line-height: 1.1;
  text-wrap: balance;
  color: rgba(255, 255, 255, 0.92);
  margin: 0 0 1.6rem;
`;

const Lede = styled(motion.p)`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(1.1rem, 2.2vw, 1.3rem);
  line-height: 1.8;
  text-wrap: pretty;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 200;
  margin: 0 0 1.4rem;
`;

const Credit = styled(motion.p)`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.92rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 200;
  margin: 0 0 4.5rem;
`;

const A = styled.a`
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.25);
  transition: color 0.25s ease, border-color 0.25s ease;

  &:hover {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  }
`;

const GroupBlock = styled(motion.section)`
  margin-bottom: 4.5rem;
  scroll-margin-top: 6rem;

  &:last-of-type {
    margin-bottom: 0;
  }

  /* Desktop: preview on the left, group text on the right. */
  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: grid;
    /* minmax(0, …) lets each column shrink past its content's min width, so an
       expanded code block scrolls inside its column instead of resizing the grid. */
    grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
    grid-template-areas:
      'head head'
      'demo tips';
    column-gap: 3.2rem;
    row-gap: 1.4rem;
    align-items: start;
    margin-bottom: 5.5rem;
  }
`;

const GroupHead = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-area: head;
    margin-bottom: 0.6rem;
  }
`;

const GroupTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 1rem;
`;

const GroupBlurb = styled.p`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.9rem;
  line-height: 1.5;
  text-wrap: pretty;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 200;
  margin: 0.7rem 0 0;
`;

/* References */
const RefSection = styled(motion.section)`
  scroll-margin-top: 6rem;
  margin-top: 1rem;
`;

const RefHead = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const RefList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const RefGroup = styled.li`
  padding: 1.5rem 0;

  &:first-child {
    padding-top: 0;
  }

  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
`;

const RefEntry = styled.div`
  & + & {
    margin-top: 1.1rem;
  }
`;

const RefLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem 0.7rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1rem;
`;

const RefMeta = styled.span`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 200;
`;

const RefInstall = styled.code`
  display: inline-block;
  margin-top: 0.8rem;
  max-width: 100%;
  overflow-x: auto;
  white-space: nowrap;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(0, 0, 0, 0.28);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.5rem 0.8rem;

  &::before {
    content: '$ ';
    color: rgba(255, 255, 255, 0.4);
  }
`;

const DemoCol = styled.div`
  margin-bottom: 1rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-area: demo;
    min-width: 0;
    align-self: start;
    position: sticky;
    top: 8rem;
    margin-bottom: 0;
  }
`;

const Idx = styled.span`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--accent) 70%, transparent);
`;

const GroupTitle = styled.h2`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 300;
  text-wrap: balance;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
`;

const TipList = styled.ul`
  list-style: none;
  margin: 0 0 2.2rem;
  padding: 0;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-area: tips;
    min-width: 0;
    margin: 0;
  }
`;

const TipItem = styled.li`
  margin-bottom: 1.6rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const TipName = styled.h3`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1.05rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.88);
  margin: 0 0 0.4rem;
`;

const TipBody = styled.p`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.98rem;
  line-height: 1.7;
  text-wrap: pretty;
  color: rgba(255, 255, 255, 0.62);
  font-weight: 200;
  margin: 0;
`;

const KeyTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
`;

const KeyTag = styled.code`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--accent) 90%, transparent);
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: 5px;
  padding: 0.16rem 0.46rem;
`;

/* ------------------------------------------------------------------ */
/* Styled — demos                                                      */
/* ------------------------------------------------------------------ */

const DemoCard = styled.div`
  background: rgba(255, 255, 255, 0.025);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1.6rem;
  margin-bottom: 1rem;
`;

const DemoCaption = styled.p`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.82rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 200;
  margin: 0 0 1.1rem;
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 1.6rem 0;
`;

const PressButton = styled(motion.button)<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  /* Specific transitions only — never "all". */
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  color: ${(p) => (p.$on ? 'var(--accent-ink)' : 'rgba(255,255,255,0.8)')};
  background: ${(p) => (p.$on ? 'var(--accent)' : 'rgba(255,255,255,0.05)')};
  border: 1px solid ${(p) => (p.$on ? 'color-mix(in srgb, var(--accent) 70%, transparent)' : 'rgba(255,255,255,0.14)')};

  &:hover {
    border-color: ${(p) => (p.$on ? 'color-mix(in srgb, var(--accent) 90%, transparent)' : 'rgba(255,255,255,0.3)')};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const IconSlot = styled.span`
  position: relative;
  display: inline-flex;
  width: 15px;
  height: 15px;
  align-items: center;
  justify-content: center;
`;

/* Typography demo */
const NumRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 1.1rem;
`;

const NumValue = styled.span<{ $tabular: boolean }>`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-variant-numeric: ${(p) => (p.$tabular ? 'tabular-nums' : 'normal')};
  font-size: 2rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 0.1rem 0.4rem;
`;

const NumUnit = styled.span`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
`;

const SampleHeading = styled.p<{ $balance: boolean }>`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1.25rem;
  font-weight: 300;
  line-height: 1.3;
  color: rgba(255, 255, 255, 0.85);
  max-width: 22ch;
  text-wrap: ${(p) => (p.$balance ? 'balance' : 'initial')};
  margin: 0 0 1.1rem;
`;

/* Surfaces demo */
const RadiusStage = styled.div`
  display: flex;
  justify-content: center;
  padding: 1.5rem 0 1.8rem;
`;

const OuterBox = styled.div`
  width: 190px;
  height: 130px;
  background: linear-gradient(150deg, #2b2654, #211d44);
  display: flex;
`;

const InnerBox = styled.div`
  flex: 1;
  background: linear-gradient(150deg, var(--accent), #f0a73c);
  opacity: 0.92;
`;

const SliderRow = styled.label`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.9rem;
`;

const SliderLabel = styled.span`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.6);
  width: 9rem;
  flex-shrink: 0;
`;

const Range = styled.input`
  flex: 1;
  accent-color: var(--accent);
  cursor: pointer;
`;

const Readout = styled.p`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.7);
  margin: 0.4rem 0 1.1rem;
`;

const Faint = styled.span`
  color: rgba(255, 255, 255, 0.4);
`;

/* Animations demo */
const StaggerStage = styled.div`
  background: rgba(0, 0, 0, 0.22);
  border-radius: 10px;
  padding: 1.4rem;
  margin-bottom: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
`;

const StaggerLine = styled.span<{ $title: boolean }>`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: ${(p) => (p.$title ? '1.15rem' : '0.92rem')};
  font-weight: ${(p) => (p.$title ? 400 : 200)};
  color: ${(p) => (p.$title ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)')};
`;

const FakeButton = styled.span`
  display: inline-flex;
  align-self: flex-start;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--accent-ink);
  background: var(--accent);
  border-radius: 8px;
  padding: 0.45rem 0.85rem;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  min-height: 2.4rem;
  align-items: center;
  margin-bottom: 1.1rem;
`;

const PopCardStage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92px;
  margin-bottom: 1.1rem;
`;

const PopCard = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 110px;
  height: 64px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.8);
`;

const OriginControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.9rem;
`;

const OriginStage = styled.div`
  position: relative;
  min-height: 132px;
`;

const Popover = styled(motion.div)<{ $trigger: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 150px;
  padding: 0.35rem;
  border-radius: 10px;
  background: #0c0a1f;
  box-shadow: ${CARD_SHADOW};
  transform-origin: ${(p) => (p.$trigger ? 'top left' : 'center')};
`;

const PopItem = styled.div`
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.78);

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

/* Performance demo */
const HitStage = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem 0;
`;

const HitButton = styled.button<{ $reveal: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    inset: 50%;
    width: 40px;
    height: 40px;
    transform: translate(-50%, -50%);
    border-radius: 8px;
    transition: background-color 0.2s ease, outline-color 0.2s ease;
    outline: 1px dashed ${(p) => (p.$reveal ? 'color-mix(in srgb, var(--accent) 70%, transparent)' : 'transparent')};
    background: ${(p) => (p.$reveal ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent')};
  }

  &:hover::before {
    background: ${(p) => (p.$reveal ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'rgba(255,255,255,0.06)')};
  }
`;

const CompareRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
`;

const AllBtn = styled.button`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  /* The anti-pattern, on purpose: everything transitions, so hover lurches. */
  transition: all 0.2s ease;

  &:hover {
    padding: 0.5rem 1.8rem;
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
  }
`;

const SpecificBtn = styled.button`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.06);
  }
`;

/* Transitions demo */
const shake = keyframes`
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
`;

const TabBar = styled.div`
  display: inline-flex;
  gap: 0.2rem;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 10px;
  padding: 0.3rem;
`;

const TabBtn = styled.button<{ $active: boolean }>`
  position: relative;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0.45rem 0.95rem;
  border-radius: 7px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.85rem;
  color: ${(p) => (p.$active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)')};
  transition: color 0.2s ease;
`;

const Pill = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.1);
  z-index: 0;
`;

const TabText = styled.span`
  position: relative;
  z-index: 1;
`;

const AccHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.8rem 1rem;
  cursor: pointer;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.85);
`;

const Chevron = styled.span<{ $open: boolean }>`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 1rem;
  line-height: 1;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  transform: ${(p) => (p.$open ? 'scaleY(-1)' : 'none')};
`;

const AccPanel = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${(p) => (p.$open ? '1fr' : '0fr')};
  transition: grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1);
`;

const AccClip = styled.div`
  overflow: hidden;
  min-height: 0;
`;

const AccBody = styled.p`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.88rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  padding: 0.9rem 0.2rem 0.2rem;
`;

const Tip = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px) scale(0.98);
  transform-origin: bottom center;
  white-space: nowrap;
  background: #0c0a1f;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.66rem;
  color: rgba(255, 255, 255, 0.8);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
`;

const TipWrap = styled.span`
  position: relative;
  display: inline-block;

  &:hover ${Tip} {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
    transition-delay: 80ms;
  }
`;

const TipTarget = styled.span`
  display: inline-block;
  cursor: default;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.4rem 0.7rem;
`;

const ShakeRow = styled.div`
  display: flex;
  gap: 0.6rem;
  align-items: center;
`;

const ShakeInput = styled.input<{ $shaking: boolean; $error: boolean }>`
  flex: 1;
  min-width: 0;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid ${(p) => (p.$error ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.14)')};
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s ease;
  animation-name: ${(p) => (p.$shaking ? shake : 'none')};
  animation-duration: 0.45s;
  animation-timing-function: cubic-bezier(0.36, 0.07, 0.19, 0.97);

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
`;

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

const BellWrap = styled.div`
  position: relative;
  display: inline-flex;
  color: rgba(255, 255, 255, 0.85);
  padding: 0.2rem;
`;

const Badge = styled(motion.span)`
  position: absolute;
  top: -3px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.6rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const PopRow = styled.div`
  display: inline-flex;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-variant-numeric: tabular-nums;
  font-size: 2rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.92);
  margin-bottom: 1rem;
`;

const Digit = styled(motion.span)`
  display: inline-block;
`;

/* Collapsible code */
const DiscBtn = styled.button`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  background: none;
  border: none;
  padding: 0.4rem 0;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.75);
  }

  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const Code = styled.pre`
  margin: 0.6rem 0 0;
  padding: 1.4rem 1.5rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.28);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
  overflow-x: auto;

  & > code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.78rem;
    line-height: 1.75;
    color: rgba(255, 255, 255, 0.78);
    white-space: pre;
  }

  /* highlight.js tokens — same palette as the blog (src/components/Blog/PostBody.tsx) */
  .hljs-comment,
  .hljs-quote {
    color: #6b7280;
    font-style: italic;
  }
  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-selector-class,
  .hljs-selector-id,
  .hljs-selector-pseudo,
  .hljs-built_in,
  .hljs-meta {
    color: #c4b5fd;
  }
  .hljs-string,
  .hljs-attr {
    color: #86efac;
  }
  .hljs-number,
  .hljs-literal {
    color: #fca5a5;
  }
  .hljs-attribute,
  .hljs-property,
  .hljs-type {
    color: #93c5fd;
  }
  .hljs-title,
  .hljs-section {
    color: var(--accent);
  }
  .hljs-tag,
  .hljs-name {
    color: #f9a8d4;
  }
`;
