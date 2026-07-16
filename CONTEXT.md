# fei.io

A personal portfolio: a landing page over video, a set of written pages, and a small
Cloudflare-backed blog. Its visual language is a single design system spanning two grounds —
one dark, one light — and this glossary names the parts.

## Language

**Surface**:
A ground that content sits on, carrying its own ink, border, glass and accent values. There
are exactly two, and every page renders on one of them.
_Avoid_: theme, mode, palette

**Inverted surface**:
The dark surface. The one every page renders on today.
_Avoid_: dark theme, night mode

**Default surface**:
The light surface. Grey paper, not white.
_Avoid_: light theme, day mode

**Bridged**:
Of a page: still rendering on the inverted surface because it has not been migrated, rather
than because it was designed for the dark. A bridged page is unfinished, not opted out.

**Migration**:
Moving a page from bridged to the default surface, by replacing its hardcoded colours with
the tokens that follow whichever surface is active. A migrated page is surface-agnostic.

**Ink**:
Foreground colour — text and glyphs. Comes in two weights, plain and muted. Ink is named for
what it is, never for the surface it sits on, because it changes with the surface.
_Avoid_: foreground, text colour

**Chrome**:
The persistent shell around a page: the header bar and the footer bar. Chrome spans every
route and therefore has to survive both surfaces, and also has to survive sitting over
video, which no page content does.
_Avoid_: shell, frame, nav

**Ramp**:
The neutral scale the whole system draws from — a single hue, with chroma rising as
lightness falls. Surfaces, ink, and borders are all steps on it.
_Avoid_: scale, greys, palette

**Accent**:
The single non-neutral colour, warm, sitting near the ramp's complement. It is surface-aware
out of necessity rather than taste: no one value is legible on both grounds, so each surface
names its own. Text placed *on* an accent fill is a separate value again.
_Avoid_: highlight, brand colour, primary

**Glass**:
The translucent slab recipe used by chrome and by raised elements. Its fill and rim take
the surface's tint; its highlight and sheen are always white, because they model reflected
light rather than pigment.
_Avoid_: frost, blur, acrylic

**Plate**:
One half of the landing's split stage — a lit ground the chrome must remain legible over.
The two plates are the reason chrome ink is asserted against something other than a surface.
_Avoid_: panel, side, half

**Seam**:
The single-pixel sheen dividing the landing's two plates.

**Reveal**:
An element that lives invisibly on the landing and surfaces only inside a lens's
refracted clone. Reveals never ship to touch or reduced-motion visitors.
_Avoid_: easter egg, hidden layer

**Travel path**:
The reveal telling the route here: city-map stops joined by a dashed line, running
chronologically to its terminus, the Dallas pin.
_Avoid_: journey map, city maps
