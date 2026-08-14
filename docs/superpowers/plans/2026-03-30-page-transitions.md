# Page Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add slide-up page transitions between all non-landing routes using framer-motion's AnimatePresence.

**Architecture:** A new `PageTransition` wrapper component holds the slide-up framer-motion variants and is applied to every page except `LandingPage`. A new `AppRoutes` component calls `useLocation()` inside the Router context and wraps `<Routes>` in `<AnimatePresence mode="wait">`, keyed by `location.pathname` so every route change triggers exit → enter.

**Tech Stack:** React 19, TypeScript (strict), framer-motion (already installed), React Router DOM 7, styled-components 6

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/components/PageTransition.tsx` | `motion.div` wrapper with slide-up variants + reduced-motion handling |
| Create | `src/AppRoutes.tsx` | Calls `useLocation()`, renders `<AnimatePresence mode="wait">` + all `<Routes>` |
| Modify | `src/App.tsx` | Replace inline `<Routes>` block with `<AppRoutes />` |
| Modify | `src/pages/About.tsx` | Wrap root `<Page>` with `<PageTransition>` |
| Modify | `src/pages/Contact.tsx` | Wrap root `<Page>` with `<PageTransition>` |
| Modify | `src/pages/Work.tsx` | Wrap root `<Page>` with `<PageTransition>` |
| Modify | `src/pages/Day.tsx` | Wrap fragment root with `<PageTransition>` |

---

## Task 1: Create PageTransition component

**Files:**
- Create: `src/components/PageTransition.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';

const DURATION = 0.38;
const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const OFFSET = 24;

interface Props {
  children: React.ReactNode;
}

const PageTransition: React.FC<Props> = ({ children }) => {
  const reduced = useReducedMotion();

  const variants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0 } },
        exit: { opacity: 0, transition: { duration: 0 } },
      }
    : {
        initial: { opacity: 0, y: OFFSET },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: DURATION, ease: EASE },
        },
        exit: {
          opacity: 0,
          y: -OFFSET,
          transition: { duration: DURATION, ease: EASE },
        },
      };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/PageTransition.tsx
git commit -m "feat: add PageTransition wrapper component"
```

---

## Task 2: Create AppRoutes + wire into App.tsx

**Files:**
- Create: `src/AppRoutes.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/AppRoutes.tsx`**

```tsx
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import About from './pages/About';
import Day from './pages/Day';
import LandingPage from './components/Landing';
import LoadingScreen from './components/Landing/LoadingScreen';
import Contact from './pages/Contact';
import Work from './pages/Work';

const AppRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/readme" element={<About />} />
        <Route path="/changelog" element={<Day />} />
        <Route path="/work" element={<Work />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/loading" element={<LoadingScreen isVisible={true} />} />
      </Routes>
    </AnimatePresence>
  );
};

export default AppRoutes;
```

- [ ] **Step 2: Update `src/App.tsx`**

Replace the entire file with:

```tsx
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import Layout from './components/Layout/Layout';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <Router>
        <Layout>
          <AppRoutes />
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 3: Type-check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors

- [ ] **Step 4: Smoke test — dev server renders without crashing**

```bash
npm run dev
```

Open http://localhost:9921. Navigate between pages — no transitions yet (pages don't use `PageTransition` yet), but routing must work correctly. Then stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/AppRoutes.tsx src/App.tsx
git commit -m "feat: add AppRoutes with AnimatePresence for page transitions"
```

---

## Task 3: Wrap About and Contact pages

**Files:**
- Modify: `src/pages/About.tsx`
- Modify: `src/pages/Contact.tsx`

- [ ] **Step 1: Update `src/pages/About.tsx`**

Add import after existing imports:

```tsx
import PageTransition from '../components/PageTransition';
```

Wrap the return value — change:

```tsx
  return (
    <Page>
```

to:

```tsx
  return (
    <PageTransition>
    <Page>
```

And close it — change the closing `</Page>` at the end of the return to:

```tsx
    </Page>
    </PageTransition>
```

- [ ] **Step 2: Update `src/pages/Contact.tsx`**

Add import after existing imports:

```tsx
import PageTransition from '../components/PageTransition';
```

Wrap the return value — change:

```tsx
  return (
    <Page>
```

to:

```tsx
  return (
    <PageTransition>
    <Page>
```

And close it — change the closing `</Page>` at the end of the return to:

```tsx
    </Page>
    </PageTransition>
```

- [ ] **Step 3: Type-check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/About.tsx src/pages/Contact.tsx
git commit -m "feat: apply page transition to About and Contact pages"
```

---

## Task 4: Wrap Work and Day pages

**Files:**
- Modify: `src/pages/Work.tsx`
- Modify: `src/pages/Day.tsx`

- [ ] **Step 1: Update `src/pages/Work.tsx`**

Add import after existing imports:

```tsx
import PageTransition from '../components/PageTransition';
```

Wrap the return value — change:

```tsx
  return (
    <Page>
```

to:

```tsx
  return (
    <PageTransition>
    <Page>
```

And close it — change the closing `</Page>` at the end of the return to:

```tsx
    </Page>
    </PageTransition>
```

- [ ] **Step 2: Update `src/pages/Day.tsx`**

Add import after existing imports:

```tsx
import PageTransition from '../components/PageTransition';
```

`Day.tsx` returns a React fragment (`<>...</>`). Replace the fragment with `PageTransition` — change:

```tsx
  return (
    <>
      {/* <NavigationDots
        sections={timeSections}
        activeSection={activeSection}
        onDotClick={scrollToSection}
      /> */}
      {showScrollIndicator && <ScrollIndicator />}

      <PageContainer>
```

to:

```tsx
  return (
    <PageTransition>
      {/* <NavigationDots
        sections={timeSections}
        activeSection={activeSection}
        onDotClick={scrollToSection}
      /> */}
      {showScrollIndicator && <ScrollIndicator />}

      <PageContainer>
```

And change the closing `</>` to `</PageTransition>`:

```tsx
      </PageContainer>
    </PageTransition>
```

- [ ] **Step 3: Type-check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/Work.tsx src/pages/Day.tsx
git commit -m "feat: apply page transition to Work and Day pages"
```

---

## Task 5: Final visual verification

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open http://localhost:9921.

- [ ] **Step 2: Verify transitions between non-landing pages**

Navigate: Readme → Changelog → Work → Contact → Readme

Expected for each navigation:
- Current page slides up and fades out (380ms)
- New page slides up in from below and fades in (380ms)
- No overlap between pages (mode="wait" — exit completes before enter begins)

- [ ] **Step 3: Verify landing page exception**

From any non-landing page, click "Home" in the nav.

Expected:
- Current page slides out normally (exit animation plays)
- Landing page appears without a slide-in animation (its own loading screen begins)

- [ ] **Step 4: Verify navigating away from landing**

From `/`, navigate to any page.

Expected:
- Landing page has no exit animation (it disappears)
- Destination page slides in from below normally

- [ ] **Step 5: Verify reduced-motion**

Open DevTools → Rendering tab → check "Emulate CSS media feature prefers-reduced-motion: reduce".

Navigate between pages. Expected: instant opacity transition only, no slide movement.

Uncheck the setting when done.

- [ ] **Step 6: Production build check**

```bash
npm run build
```

Expected: no TypeScript or build errors.
