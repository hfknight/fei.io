# Logo Shimmer Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a diagonal amber shimmer sweep to the landing page logo that loops idly after the entrance animation settles.

**Architecture:** A `LogoShimmerWrap` container wraps the existing `LogoIcon`, using a CSS `mask-image` (SVG data URI of the logo path) to clip a `ShimmerBeam` div to the exact logo shape. The beam animates via a CSS keyframe that sweeps left→right in 0.6s then holds off-screen for ~4.4s before repeating. Entrance delay of 1.5s ensures the shimmer starts only after the `fadeUp` entrance completes.

**Tech Stack:** React 19, styled-components 6, framer-motion (existing), no new dependencies

---

### Task 1: Add shimmer to `IntroPanel.tsx`

**Files:**
- Modify: `src/components/Landing/IntroPanel.tsx`

- [ ] **Step 1: Add `keyframes` import from styled-components**

At the top of `src/components/Landing/IntroPanel.tsx`, update the styled-components import:

```tsx
import styled, { keyframes } from 'styled-components';
```

- [ ] **Step 2: Add the shimmer keyframe animation**

After the existing imports (before the first `const` styled-component), add:

```tsx
const shimmerSweep = keyframes`
  0% {
    transform: translateX(-88px) rotate(-20deg);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  12% {
    transform: translateX(124px) rotate(-20deg);
    animation-timing-function: linear;
  }
  100% {
    transform: translateX(124px) rotate(-20deg);
  }
`;
```

- [ ] **Step 3: Add `LogoShimmerWrap` styled-component**

Add after `shimmerSweep`:

```tsx
const LogoShimmerWrap = styled.div`
  position: relative;
  width: 88px;
  height: 88px;
  overflow: hidden;
  mask-image: url("data:image/svg+xml,%3Csvg width='88' height='88' viewBox='0 0 450 450' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M450 225C450 349.264 349.264 450 225 450C100.736 450 0 349.264 0 225C0 100.736 100.736 0 225 0C349.264 0 450 100.736 450 225ZM225 420C332.696 420 420 332.696 420 225C420 203.544 416.535 182.897 410.133 164L410 164L304 164L278.692 229H360L348 259H267.188L205.809 419.068C212.122 419.684 218.524 420 225 420ZM174.962 413.52C91.5114 391.429 30 315.398 30 225C30 174.086 49.5128 127.729 81.4681 93H196.22L109 319H141L240 62H117.927C148.661 41.7709 185.456 30 225 30C299.425 30 364.112 71.6947 396.976 133H283L246.027 229H194L182 259H234.473L174.962 413.52Z' fill='black'/%3E%3C/svg%3E");
  mask-size: 88px 88px;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg width='88' height='88' viewBox='0 0 450 450' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M450 225C450 349.264 349.264 450 225 450C100.736 450 0 349.264 0 225C0 100.736 100.736 0 225 0C349.264 0 450 100.736 450 225ZM225 420C332.696 420 420 332.696 420 225C420 203.544 416.535 182.897 410.133 164L410 164L304 164L278.692 229H360L348 259H267.188L205.809 419.068C212.122 419.684 218.524 420 225 420ZM174.962 413.52C91.5114 391.429 30 315.398 30 225C30 174.086 49.5128 127.729 81.4681 93H196.22L109 319H141L240 62H117.927C148.661 41.7709 185.456 30 225 30C299.425 30 364.112 71.6947 396.976 133H283L246.027 229H194L182 259H234.473L174.962 413.52Z' fill='black'/%3E%3C/svg%3E");
  -webkit-mask-size: 88px 88px;
`;
```

- [ ] **Step 4: Add `ShimmerBeam` styled-component**

Add after `LogoShimmerWrap`:

```tsx
const ShimmerBeam = styled.div<{ $reduced: boolean }>`
  position: absolute;
  top: -10px;
  left: 0;
  width: 36px;
  height: 108px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 240, 200, 0.5),
    transparent
  );
  transform-origin: top left;
  pointer-events: none;
  animation: ${shimmerSweep} 5s linear 1.5s infinite both;

  ${({ $reduced }) => $reduced && 'display: none;'}

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;
```

- [ ] **Step 5: Wrap `LogoIcon` with `LogoShimmerWrap` and add `ShimmerBeam`**

In the JSX, find the `<Logo>` block:

```tsx
<Logo variants={fade} initial="hidden" animate="visible" custom={0.4}>
  <LogoIcon />
</Logo>
```

Replace with:

```tsx
<Logo variants={fade} initial="hidden" animate="visible" custom={0.4}>
  <LogoShimmerWrap>
    <LogoIcon />
    <ShimmerBeam $reduced={reducedMotion ?? false} />
  </LogoShimmerWrap>
</Logo>
```

- [ ] **Step 6: Run type check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: no errors or warnings.

- [ ] **Step 7: Verify visually in dev server**

```bash
npm run dev
```

Open `http://localhost:9921`. After the loading screen exits:
- Logo fades in normally (entrance unchanged)
- ~1.5s after the logo appears, a diagonal shimmer sweeps across it
- Shimmer repeats every ~5s
- Hover glow on the logo still works
- No shimmer spills outside the logo shape

- [ ] **Step 8: Commit**

```bash
git add src/components/Landing/IntroPanel.tsx
git commit -m "feat: add shimmer sweep animation to landing logo"
```
