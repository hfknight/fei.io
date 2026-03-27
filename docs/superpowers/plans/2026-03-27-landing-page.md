# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen cinematic landing page at `/` with a looping video background, glassmorphism identity panel, and twilight loading screen; move the existing day-journey to `/journey`.

**Architecture:** `LandingPage` is a self-contained component tree under `src/components/Landing/` that renders outside the existing `Layout` wrapper (no footer). `App.tsx` is restructured so `/` renders `LandingPage` directly and `/journey` renders `Day` inside `Layout`. Loading state is managed in `LandingPage` via a boolean flag toggled by the video's `canplay` event.

**Tech Stack:** React 19, TypeScript, styled-components 6, framer-motion, React Router DOM 7, vite-plugin-svgr

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/components/Landing/VideoBackground.tsx` | `<video>` element + dark overlay |
| Create | `src/components/Landing/LoadingScreen.tsx` | Twilight gradient loading screen with logo animation |
| Create | `src/components/Landing/GlassPanel.tsx` | Centered frosted-glass identity panel |
| Create | `src/components/Landing/NavBar.tsx` | Fixed glass nav bar |
| Create | `src/components/Landing/index.tsx` | Root landing page — composes all sub-components, owns loading state |
| Modify | `src/App.tsx` | Re-route `/` → `LandingPage`, `/journey` → `Day` inside `Layout` |

> **Note:** No test suite is configured for this project. TDD steps are omitted. Verify correctness by running `npm run dev` and visually inspecting at each task.

---

## Task 1: VideoBackground component

**Files:**
- Create: `src/components/Landing/VideoBackground.tsx`

- [ ] **Step 1: Create VideoBackground.tsx**

```tsx
import styled from 'styled-components';

const Wrapper = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
`;

interface Props {
  onCanPlay: () => void;
}

const VideoBackground: React.FC<Props> = ({ onCanPlay }) => (
  <Wrapper>
    <Video
      src="/intro.mp4"
      autoPlay
      loop
      muted
      playsInline
      onCanPlay={onCanPlay}
    />
    <Overlay />
  </Wrapper>
);

export default VideoBackground;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Landing/VideoBackground.tsx
git commit -m "feat: add VideoBackground component"
```

---

## Task 2: LoadingScreen component

**Files:**
- Create: `src/components/Landing/LoadingScreen.tsx`

- [ ] **Step 1: Create LoadingScreen.tsx**

```tsx
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const pulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;

const Screen = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0d1b2a 0%, #1a1025 100%);
`;

const LogoWrap = styled(motion.div)`
  width: min(35vmin, 120px);
  height: min(35vmin, 120px);
  animation: ${pulse} 2s ease-in-out infinite;
`;

const Logo = styled(LogoOutlinedSvg)`
  width: 100%;
  height: 100%;
  color: #fff;
  path, circle, rect, polygon {
    fill: currentColor;
  }
`;

interface Props {
  isVisible: boolean;
}

const LoadingScreen: React.FC<Props> = ({ isVisible }) => (
  <AnimatePresence>
    {isVisible && (
      <Screen
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.6 } }}
      >
        <LogoWrap
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.8 } }}
        >
          <Logo />
        </LogoWrap>
      </Screen>
    )}
  </AnimatePresence>
);

export default LoadingScreen;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Landing/LoadingScreen.tsx
git commit -m "feat: add LoadingScreen component"
```

---

## Task 3: NavBar component

**Files:**
- Create: `src/components/Landing/NavBar.tsx`

- [ ] **Step 1: Create NavBar.tsx**

```tsx
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const Bar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
`;

const LogoIcon = styled(LogoOutlinedSvg)`
  height: 32px;
  width: auto;
  color: #fff;
  path, circle, rect, polygon {
    fill: currentColor;
  }
`;

const NavLinks = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 2rem;
`;

const NavItem = styled.li``;

const NavLink = styled(Link)`
  color: #fff;
  opacity: 0.75;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
`;

const NavBar: React.FC = () => (
  <Bar>
    <LogoLink to="/">
      <LogoIcon />
    </LogoLink>
    <NavLinks>
      <NavItem>
        <NavLink to="/journey">Journey</NavLink>
      </NavItem>
    </NavLinks>
  </Bar>
);

export default NavBar;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Landing/NavBar.tsx
git commit -m "feat: add NavBar component"
```

---

## Task 4: GlassPanel component

**Files:**
- Create: `src/components/Landing/GlassPanel.tsx`

- [ ] **Step 1: Create GlassPanel.tsx**

```tsx
import styled from 'styled-components';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const Panel = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 48px;
  border-radius: 16px;
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  max-width: 480px;
  text-align: center;
`;

const Logo = styled(LogoOutlinedSvg)`
  width: 120px;
  height: 120px;
  color: #fff;
  path, circle, rect, polygon {
    fill: currentColor;
  }
`;

const Gap = styled.div`
  height: 32px;
`;

const Tagline = styled.p`
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
`;

const GlassPanel: React.FC = () => (
  <Panel>
    <Logo />
    <Gap />
    <Tagline>
      Web Developer based in Texas, US.<br />
      creating aesthetical and intuitive user interfaces that blend thoughtful
      design with robust engineering.
    </Tagline>
  </Panel>
);

export default GlassPanel;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Landing/GlassPanel.tsx
git commit -m "feat: add GlassPanel component"
```

---

## Task 5: LandingPage root component

**Files:**
- Create: `src/components/Landing/index.tsx`

- [ ] **Step 1: Create Landing/index.tsx**

```tsx
import { useState } from 'react';
import styled from 'styled-components';
import VideoBackground from './VideoBackground';
import LoadingScreen from './LoadingScreen';
import NavBar from './NavBar';
import GlassPanel from './GlassPanel';

const Page = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LandingPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Page>
      <VideoBackground onCanPlay={() => setIsLoading(false)} />
      <NavBar />
      <GlassPanel />
      <LoadingScreen isVisible={isLoading} />
    </Page>
  );
};

export default LandingPage;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Landing/index.tsx
git commit -m "feat: add LandingPage root component"
```

---

## Task 6: Update routing in App.tsx

**Files:**
- Modify: `src/App.tsx`

The landing page must render outside `Layout` (no footer). The `/journey` route keeps `Layout`. The existing `/about` and `/load` routes are kept inside `Layout`.

- [ ] **Step 1: Read current App.tsx**

Current content:
```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import Layout from './components/Layout/Layout';
import About from './pages/About';
import Home from './pages/Day';
import Loading from './pages/Loading';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/load" element={<Loading />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 2: Replace App.tsx with updated routing**

```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import Layout from './components/Layout/Layout';
import About from './pages/About';
import Day from './pages/Day';
import Loading from './pages/Loading';
import LandingPage from './components/Landing';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/journey"
            element={
              <Layout>
                <Day />
              </Layout>
            }
          />
          <Route
            path="/about"
            element={
              <Layout>
                <About />
              </Layout>
            }
          />
          <Route
            path="/load"
            element={
              <Layout>
                <Loading />
              </Layout>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 3: Verify dev server starts and `/` shows the landing page**

Run: `npm run dev`

Navigate to `http://localhost:9921`:
- Loading screen appears with twilight gradient and pulsing logo
- Once video loads, loading screen fades out
- Video plays full-screen, looped, muted
- Glass panel is centered with outlined logo and tagline
- Nav bar is fixed at the top with logo (left) and "Journey" link (right)

Navigate to `http://localhost:9921/journey`:
- Existing day-journey site loads as before

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up landing page at / and move day-journey to /journey"
```
