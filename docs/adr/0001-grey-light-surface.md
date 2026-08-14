# The light surface is grey, and the accent is darkened to serve it

The landing's left plate is a pale grey (`#e9eaeb` → `#d4d6d8`). We wanted the written pages
to read as a continuation of it, so `--color-surface` is `--n-3` (`#e3e4e7`) rather than the
near-white `--n-0` the light theme was originally authored with.

That single choice cascades, because three tokens had been tuned against near-white with no
headroom. On `--n-3`: `--chrome-ink-muted` fell to 3.83:1 and moved to `--n-9` (5.87:1), which
makes it identical to `--color-ink-muted` — the same collapse the inverted surface already has.
`--color-border` fell to 1.13:1, fainter than the dark surface's own border, and moved to `--n-5`
(1.47:1). And `--accent` fell to 4.22:1 and was darkened to `oklch(0.50 0.111 92)` (4.73:1).

## Considered options

Staying at `--n-0` costs nothing and keeps a more vivid accent, but the pages then read as white
paper and lose the tie to the landing. A middle value (`--n-1`) was rejected on the numbers: the
accent squeaks through at 4.51:1 while `--chrome-ink-muted` still fails at 4.32:1, so it pays most
of the cost for a fraction of the effect. Reproducing the plate's gradient rather than a flat
colour was rejected because `--color-surface` would stop being a colour, and the contrast
guarantees would vary across the page.

## Consequences

The light accent is `#7a6000`, a dark olive-bronze, and it is the link colour on every light page.
This is not a mistake. At hue 92 a yellow dark enough to clear AA on grey paper is not yellow any
more, and hue 92 is kept because it sits 173° from the ramp's 265 — near its complement. Choosing
vivid over legible was available and was declined.

Reverting to a lighter surface means re-deriving the accent, not just editing one line.

The inverted surface is untouched. `tokens.test.ts` needed no new assertions: its contrast checks
read `lightVars` dynamically, so they re-evaluate against these values and still pass — including
the guard proving a single accent could not serve both surfaces (the dark accent measures 1.14:1
on the light surface, well under the `< 2` the test demands).

## Later refined

The grey moved off `--n-3` to a bespoke off-ramp value, `oklch(0.913 0.0013 106.4)` (`#e2e2e1`) —
near-neutral and a hair darker — and the pages gained a faint paper grain (a fixed noise overlay
in `GlobalStyles.ts`, scoped to the light surface). The accent tightened to 4.63:1 and the border
to 1.44:1 on the slightly darker ground; both still clear their thresholds, so no retune. The
decision this ADR records — a grey, off-ramp light surface with a darkened accent — is unchanged.
