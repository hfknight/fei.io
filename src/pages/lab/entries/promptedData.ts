// Pure data module for /lab/prompted — no React. The gallery imports promptedByDate()
// for display order and thumbUrl() for grid/lightbox thumbnails; the page itself carries
// no data of its own so new pieces are added here, not in the component.

export type PromptedItem = {
  id: string; // stable unique id, used as React key and for prev/next
  title?: string; // optional display title
  prompt: string; // the full verbatim prompt
  model: string; // e.g. 'Midjourney v7'
  date: string; // YYYY-MM-DD
} & (
  | { type: 'image'; src: string } // full-size webp URL
  | { type: 'video'; webm: string; mp4: string; poster: string } // poster doubles as grid thumb
);

/**
 * The shelf. Empty for now — curated by hand as pieces are picked, not generated or
 * scraped. Two examples below (never rendered; promptedItems stays []) show the shape
 * each media type takes.
 *
 * const examples: PromptedItem[] = [
 *   {
 *     id: 'foxfire-lantern',
 *     title: 'foxfire lantern',
 *     prompt: 'a paper lantern shaped like a fox, lit from within, floating over a still lake at night, ink wash style',
 *     model: 'Midjourney v7',
 *     date: '2026-08-01',
 *     type: 'image',
 *     src: 'https://media.fei.io/lab/prompted/foxfire-lantern.webp',
 *   },
 *   {
 *     id: 'tide-clock',
 *     title: 'tide clock',
 *     prompt: 'a brass clock whose hands are made of slow-moving water, macro shot, studio lighting',
 *     model: 'Runway Gen-4',
 *     date: '2026-08-05',
 *     type: 'video',
 *     webm: 'https://media.fei.io/lab/prompted/tide-clock.webm',
 *     mp4: 'https://media.fei.io/lab/prompted/tide-clock.mp4',
 *     poster: 'https://media.fei.io/lab/prompted/tide-clock-poster.webp',
 *   },
 * ];
 */
export const promptedItems: PromptedItem[] = [
  {
    id: 'writing-hero',
    title: 'jojo and ollie at the window',
    prompt: `Create a **vertical 2:3 fine-art watercolor illustration** closely matching the reference composition.

### Overall composition

A peaceful, elegant **European cottage exterior** painted in delicate traditional watercolor on warm ivory paper.

The image is a **tall portrait composition**, approximately **2:3 aspect ratio**.

The majority of the image is a large, pale warm-white stucco wall with extensive **intentional negative space**, especially in the lower half.

In the **upper-left to upper-middle area**, an old wooden window is embedded into the wall. The window occupies roughly the central-left third of the composition.

A climbing **peach-apricot rose vine** grows across the top of the wall, with long natural branches extending horizontally and diagonally downward around the window.

### Window

An old-fashioned **wood-framed cottage window**, warm natural honey-brown aged wood.

The window is positioned around the **middle-left portion of the image**, not centered.

It has:

* thick rustic wooden frame
* slightly weathered wood grain
* imperfect handmade construction
* two vertical window sections
* old translucent glass
* subtle reflections
* soft cream-colored curtains behind the left glass section

The **right window panel is opened outward toward the viewer/right side**, creating a strong three-dimensional perspective.

The open wooden panel is narrow and tall, with multiple rectangular glass panes.

The interior behind the window is **very dark charcoal brown**, almost black, providing strong contrast against the bright exterior.

Do not make the window modern, symmetrical, polished, or luxurious. It should feel like an old European countryside cottage.

### Animals

Two animals are sitting together naturally on the windowsill.

A **fluffy white Samoyed** sits toward the right side of the opening.

The Samoyed:

* small-to-medium visual scale relative to window
* fluffy pure-white coat
* triangular upright ears
* round friendly face
* dark eyes
* black nose
* gentle happy expression
* mouth slightly open with a subtle smile
* soft fluffy chest and neck
* facing directly toward the viewer

Beside the dog, on the **left side of the windowsill**, lies a relaxed **brown-and-gray tabby cat**.

The cat:

* lying horizontally on the sill
* curled/relaxed body
* striped brown-gray fur
* darker stripes on forehead, back, and tail
* head facing slightly toward the viewer/right
* peaceful sleepy expression

The two animals should feel like they naturally belong together in the cottage scene.

### Roses and climbing vine

The dominant botanical element is a **mature climbing rose vine with peach, apricot, cream, and pale golden roses**.

The roses should be realistic and botanically recognizable, but rendered in loose watercolor.

Large clusters of roses occupy the **entire upper portion** of the image.

Important placement:

* several large blossoms along the very top edge
* large rose blossoms distributed across the upper-left and upper-center
* several blossoms extending toward the upper-right
* branches crossing horizontally above the window
* long thin thorny stems descending around the window
* several leaves and branches extending down the right side
* a long branch curves downward along the lower-right quadrant
* several roses appear near the lower-right edge
* a few flowers hang directly around the open window

Use **natural irregular spacing**, not a repetitive floral pattern.

The flowers should vary in:

* size
* openness
* angle
* maturity
* petal density

Some roses are fully open, some partially open, and some are small buds.

### Foliage

Leaves are muted natural **sage green, olive green, and dusty forest green**.

Leaves should be:

* soft-edged
* individually painted
* varied in size
* slightly translucent
* naturally scattered along the branches

Avoid perfectly symmetrical leaves or decorative wallpaper-like repetition.

### Wall

The background is a **warm ivory / off-white stucco wall**.

It should have a beautiful handmade watercolor texture:

* subtle plaster irregularities
* warm cream undertones
* pale gray-beige patches
* visible watercolor paper grain
* soft pigment blooms
* slightly uneven washes

The wall must remain predominantly light and quiet.

### Sunlight and shadows

Soft natural sunlight comes from the **upper-left**.

Cast delicate **diagonal shadows of the rose branches and leaves** across the wall.

The shadows should travel generally:
**from upper-left toward lower-right**.

They must be:

* soft-edged
* translucent
* pale cool gray
* physically plausible
* naturally distorted by the wall
* clearly recognizable as foliage shadows

Do NOT make the shadows harsh or photographic.

The lighting should feel like a quiet sunny spring morning.

### Watercolor style

Traditional **high-end botanical watercolor illustration**, painted on textured cold-press watercolor paper.

Use:

* transparent watercolor washes
* layered pigment
* soft bleeding edges
* subtle granulation
* visible paper texture
* delicate dry-brush marks
* slightly imperfect hand-painted contours
* gentle color variation
* atmospheric edges

The artwork should feel **hand-painted**, not digitally rendered.

Avoid hard digital outlines.

Some areas should intentionally dissolve softly into the paper.

### Color palette

Overall palette is extremely soft and restrained:

* warm ivory
* cream
* pale beige
* dusty sage green
* muted olive
* soft gray
* warm honey brown
* peach
* apricot
* pale golden yellow
* very subtle cool gray shadows

Low saturation, elegant, airy, calm.

The peach/apricot roses provide the primary color accent.

### Negative space

This is extremely important.

Keep a **large amount of almost-empty pale wall in the lower half of the image**.

The lower-left and central-lower areas should contain mostly:

* pale ivory wall
* extremely subtle watercolor texture
* sparse soft shadows

Do not fill the entire canvas with flowers.

The composition should feel spacious, quiet, sophisticated, and airy.

### Exact visual hierarchy

The eye should naturally move in this order:

1. peach roses and foliage across the upper portion
2. rustic open wooden window
3. smiling white Samoyed
4. relaxed tabby cat
5. long rose branch descending on the right
6. large empty pale wall below

### Rendering

Ultra-detailed traditional watercolor painting, refined botanical illustration, elegant European cottage aesthetic, soft natural daylight, delicate atmospheric depth, realistic animal anatomy, beautiful flower structure, sophisticated composition, subtle paper texture, museum-quality watercolor artwork.

**No text, no typography, no signs, no people, no modern architecture, no furniture, no extra animals, no extra windows, no duplicated flowers, no symmetrical floral arrangement, no harsh outlines, no photorealism, no 3D rendering, no anime, no cartoon style, no saturated colors, no dark overall background.**

**Composition should closely reproduce the reference: an old open wooden window positioned left-of-center, white Samoyed and tabby on the sill, dense apricot rose canopy across the upper portion, long climbing branches around the window and down the right side, and extensive pale negative space across the lower portion.**`,
    model: 'ChatGPT',
    date: '2026-08-11',
    type: 'image',
    src: 'https://media.fei.io/lab/prompted/writing-hero.webp',
  },
  {
    id: 'huangshan-map-loop',
    title: 'huangshan grows out of the map',
    prompt: `THE IMAGE

Create a premium minimalist 3D cartographic diorama of Huangshan (黄山), China, viewed from a diagonally elevated aerial perspective, matching the visual language of a refined monochromatic city-map illustration.

Composition

A flat 2D map of the Huangshan region fills the entire image. The map is pale warm gray / ivory, with extremely subtle roads, waterways, terrain boundaries, and cartographic lines.

At the center or slightly above center, a three-dimensional landscape appears to physically grow upward out of the flat map, creating the visual focal point.

The transition from the 2D map into the 3D terrain should feel seamless, as if the map itself is transforming into a miniature physical landscape.

Main 3D subject

The central subject is a recognizable interpretation of Huangshan scenery, featuring:

A small number of dramatic, slender granite peaks
Distinctive Huangshan-style jagged rock formations
Ancient pine trees growing from cliffs and rock faces
Soft mist and clouds wrapping around the mountains
Layered mountain ridges with strong vertical forms
A tranquil stream or small body of water near the foreground
A small number of traditional Huizhou (徽派) residential buildings
White plaster walls
Dark gray/black tiled roofs
Traditional Huizhou architectural proportions
Small bridges, paths, stone walls, and scattered vegetation

The mountains should remain the dominant element, with the Huizhou village acting as a secondary detail integrated naturally into the landscape.

Avoid making the village too large or dense. Keep the number of buildings limited and elegant.

Visual style

Highly detailed miniature architectural landscape / 3D diorama, sophisticated editorial design, realistic physically modeled terrain, subtle handcrafted quality, delicate atmospheric perspective.

The surrounding map remains almost entirely monochromatic, using pale ivory, warm gray, light gray, and charcoal-gray linework.

The 3D Huangshan landscape may use very subtle low-saturation natural colors—muted gray-green pine trees, slightly warm off-white architecture, subdued stone tones—but remain restrained and harmonious with the monochrome map.

Lighting

Soft, diffuse studio lighting from above.

Very subtle ambient occlusion beneath the mountains and buildings.

Soft shadows where the 3D landscape emerges from the map.

Gentle mist around the mountain bases.

High-key, airy atmosphere with plenty of negative space.

Depth and edges

The center should be sharp and highly detailed.

The map gradually becomes softer and more faded toward the outer edges, creating a subtle blur / fade-to-white vignette.

Keep the outer map extremely light and understated so that attention remains on the central 3D landscape.

Typography

No text anywhere in the image.
Do not include “黄山”, “Huangshan”, city names, labels, roadsigns, captions, or decorative typography.

Important constraints
No location pin
No modern city skyline
No excessive buildings
No excessive mountain peaks
No saturated colors
No dramatic dark background
No photographic landscape background
No conventional flat illustration
No borders or UI elements

The final image should look like a luxury editorial 3D map illustration, where a subtle monochrome map transforms into a miniature Huangshan landscape, combining Huangshan granite mountains, ancient pine trees, mist, and a restrained Huizhou village as one cohesive sculptural centerpiece.

Aspect ratio: 4:3 landscape.

THE LOOP

A static shot of mountains with slow-moving clouds drifting between the peaks, perfectly matching the overall color tone of the image, seamless loop with identical first and last frames.`,
    model: 'ChatGPT / Seedance 2',
    date: '2026-07-17',
    type: 'image',
    src: 'https://media.fei.io/lab/prompted/huangshan-map-loop.webp',
  },
  {
    id: 'fanmatchday-bg',
    title: 'golden hour, mid-flight',
    prompt:
      'Dynamic,low-angle photograph macro shot a fifa World Cup 2026 soccer ball in ' +
      'mid-flight above stadium field, scattering dirt and grass particles. The textured ' +
      'ball is the central focus, suspended in the air above the green grass pitch. A trail ' +
      'of backlit particles and spray is kicked up behind the ball. In the background, a ' +
      'massive stadium structure with blurred tiers of spectators, goalposts, and a large ' +
      'roof canopy are visible. The scene is set during the golden hour (late afternoon) ' +
      'with dramatic backlighting from the sun, which creates a strong lens flare and ' +
      'significant golden bokeh from the stadium lights and the floating particles. The ' +
      'depth of field is shallow, rendering the grass and the background as a soft blur. ' +
      'The vertical composition is filled with warm, cinematic light and clouds. 16:9 High ' +
      'resolution, action photography style, and warm color grading.',
    model: 'Nano Banana 2',
    date: '2026-08-05',
    type: 'image',
    src: 'https://media.fei.io/lab/prompted/fanmatchday-bg.webp',
  },
  {
    id: 'lab-hand',
    title: 'the hand behind the lab',
    prompt: `Create an ultra-detailed, photorealistic cinematic 3D artwork of a **single futuristic biomechanical robotic hand and forearm**, standing vertically upright on a dark futuristic technological surface.

### Composition

* **Portrait 9:16 composition**
* The entire hand and forearm are visible from the lower wrist/forearm to the fingertips
* Hand positioned almost exactly in the **center of the frame**
* Palm facing toward the viewer, fingers naturally extended downward and slightly separated
* Wrist and forearm extend upward and continue beyond the top edge of the frame
* Camera positioned at approximately **eye level with the hand**, with a subtle perspective looking slightly upward
* Symmetrical, centered composition with strong vertical visual alignment
* Hand occupies approximately **65–75% of the image height**
* Background remains visible around both sides of the hand

### Cybernetic anatomy

Design the hand as an extremely sophisticated **transparent biomechanical prosthetic**, combining elegant human anatomy with advanced cybernetic engineering.

The outer hand should be made from **semi-transparent smoked glass / translucent synthetic skin**, allowing the internal mechanical structure to remain clearly visible.

Inside the transparent hand:

* intricate mechanical finger bones
* black titanium structural components
* miniature pistons
* articulated joints
* precision gears
* micro-servos
* hydraulic mechanisms
* thin fiber-optic cables
* electrical wiring
* layered mechanical plates
* tiny industrial components
* realistic internal tendons and artificial muscles

The mechanical construction should feel **functional and engineered**, not ornamental.

The transparent material should have realistic:

* refraction
* reflections
* internal scattering
* subtle imperfections
* glossy highlights
* translucent edges
* realistic thickness

The hand should feel like an expensive prototype from an advanced near-future laboratory.

### Forearm

The forearm should be significantly more mechanical and industrial than the hand.

Include:

* exposed mechanical architecture
* black carbon-fiber structures
* metallic joints
* bundled cables
* orange illuminated fiber-optic lines
* layered armor plates
* exposed artificial tendons
* complex internal machinery

The upper forearm becomes increasingly dense and mechanical toward the top.

### Lighting

Use a restrained **black, charcoal gray, silver, white, and burnt orange** color palette.

The dominant illumination comes from:

* thin orange-red cyberpunk light sources
* subtle warm orange glow from internal cables
* cold white reflections
* soft gray ambient illumination

Orange light should travel through the transparent hand and illuminate internal components.

Create realistic **volumetric reflections and light transmission through the translucent material**.

Strong but controlled specular highlights should reveal the shape of the fingers and mechanical surfaces.

### Background

Behind the hand is a **dense futuristic cyberpunk megacity at night**, but heavily defocused and partially obscured.

The city should appear as if it is being visually reflected and refracted through the transparent robotic hand.

Include:

* enormous futuristic skyscrapers
* vertical architectural structures
* countless tiny illuminated windows
* distant white city lights
* dark gray buildings
* thin vertical orange-red neon strips
* fragmented digital signage
* subtle holographic elements
* atmospheric haze
* deep urban depth

The city must remain **abstract and architectural**, with no readable advertisements, logos, people, vehicles, or recognizable landmarks.

### Glitch / digital aesthetic

Overlay the scene with extremely subtle **vertical cybernetic data artifacts**:

* thin vertical orange lines
* fragmented scan lines
* translucent geometric fragments
* broken light streaks
* tiny pixel clusters
* digital noise
* subtle holographic interference
* vertical data streams

These elements should appear integrated into the scene rather than looking like a simple Photoshop overlay.

Some vertical orange lines should pass directly across the hand, creating a **glitch/refraction effect**.

### Ground

The hand stands on a futuristic **hexagonal modular technological platform**.

The floor consists of overlapping dark graphite and black hexagonal panels with:

* subtle engraved circuit patterns
* micro-text
* tiny technical markings
* recessed seams
* metallic edges
* glossy surfaces

Thin **warm orange light** glows from some seams between the hexagonal panels.

The floor should reflect the hand subtly.

### Materials

Extremely realistic material separation:

* transparent smoked glass
* polished black metal
* brushed titanium
* carbon fiber
* glossy synthetic polymer
* dark rubber
* tiny exposed copper wires
* illuminated fiber optics

Every material should have a distinct physically realistic response to light.

### Atmosphere

Mood: **elegant, mysterious, futuristic, sophisticated, powerful, technological**

The image should feel like a high-end **cinematic science-fiction concept photograph / premium futuristic product render**, not an illustration.

Very high micro-detail, realistic physically based rendering, cinematic depth, subtle film grain, volumetric atmosphere, realistic optical behavior, ray-traced reflections, global illumination, high dynamic range.

### Color grading

Predominantly: **charcoal gray + black + silver + desaturated white**

with carefully controlled accents of: **burnt orange / amber / red-orange**

Avoid excessive neon colors.

### Visual quality

Photorealistic, ultra-high resolution, extremely sharp mechanical details, realistic transparent materials, physically accurate reflections and refractions, cinematic lighting, ray tracing, global illumination, realistic depth of field, premium sci-fi cinematography, high-end VFX quality, sophisticated composition.

**No text, no logos, no watermark, no people, no face, no extra limbs, no second hand, no weapons, no cartoon appearance, no anime, no exaggerated neon rainbow colors, no fantasy ornamentation, no distorted fingers, no malformed anatomy, no floating components.**`,
    model: 'ChatGPT',
    date: '2026-08-10',
    type: 'image',
    src: 'https://media.fei.io/lab/prompted/lab-hand.webp',
  },
  {
    id: 'fwc26-dallas',
    title: 'dallas in six letters',
    prompt: `Create an ultra-high-resolution typography-based FIFA World cup 2026 poster design themed around Dallas.

Aspect ratio: (16:9 poster)

IMPORTANT:

All visible text inside the poster must be in English only.

Typography must be perfectly spelled and professionally typeset.

Absolutely no distorted letters, random symbols, broken text, or AI-generated gibberish.

Aspect ratio: 16:9 poster

CORE COMPOSITION:

Place the giant English word “Dallas” prominently in the center of the composition

Each individual letter should contain a different illustrated scene related to world cup from the city

Letters should be tall, elongated, bold sans-serif forms

The typography itself should feel like a series of “city gallery windows”

Distribute landmarks, streets, transportation, nature, culture, and architecture naturally across the letters

Scenes should visually flow from one letter into another like one connected urban panorama

TOP HORIZONTAL STRIP:
At the top of the poster, include a thin panoramic horizontal strip containing:

city skyline silhouettes
Soccer
cars
trams or trains
boats if relevant
birds
clouds
sun

All elements should appear minimalist, elegant, and rhythmically balanced.

STYLE:
modern sport editorial poster,
Swiss graphic design,
minimal vector illustration,
architectural infographic aesthetic,
travel typography poster,
flat geometric illustration,
ultra clean composition,
premium magazine design,
screen print poster feeling,
retro-futuristic travel branding

ILLUSTRATION STYLE:

flat vector shapes only

no realism

no gradients

no texture noise

clean geometric shadows

simplified architectural forms

map-like top-down illustration mixed with side-view cityscape

subtle line-art details

perfectly clean vector edges

strong negative space usage

harmonious visual rhythm between letters

TYPOGRAPHY:

giant bold sans-serif typography

letters occupy most of the canvas height

ultra precise alignment

each letter acts as an independent framed illustration panel

smooth rounded corners where appropriate

editorial spacing

highly balanced composition

typography must look professionally designed, print-ready, and geometrically perfect

COLOR PALETTE:
Automatically derive a cohesive palette inspired by Dallas.

Examples:

coastal city → aqua, sand, coral, muted teal

desert city → terracotta, beige, warm cream

cyber city → mint, navy, steel blue

historic European city → dusty rose, olive green, parchment

Use:

muted pastel tones

soft vintage travel poster colors

elegant low-saturation combinations

maximum 4–6 colors only

CONTENT GENERATION:
Automatically include:

Stadium that hosts world cup matches

iconic landmarks of Dallas

famous streets and transportation

local urban patterns

nearby nature elements

skyline silhouettes

bridges, rivers, or coastline if relevant

culturally symbolic architecture

recognizable local atmosphere

COMPOSITION:

centered typography composition

white or soft ivory background

lots of breathing room

top panoramic strip balances the heavy typography below

asymmetrical but visually balanced layout

each letter contains different scene depth and perspective

premium poster hierarchy with museum-quality layout

MOOD:
premium,
intellectual,
Energetic,
design-forward,
travel editorial aesthetic,
stylish enough for a stadium gift shop poster

QUALITY:
8K ultra detailed,
print-ready,
extremely sharp vector edges,
perfect typography rendering,
clean professional graphic design,
high-end editorial poster quality,
no distorted text,
no random characters,
no spelling errors,
no AI artifacts`,
    model: 'ChatGPT',
    date: '2026-05-16',
    type: 'image',
    src: 'https://media.fei.io/lab/prompted/fwc26-dallas.webp',
  },
  {
    id: 'folk-flat-illustration',
    title: 'folk flat illustration',
    prompt:
      'Please transform the entire image into a single Decorative Folk Flat Illustration ' +
      'with Doodle elements. Use a bold and playful color palette, completely different ' +
      'from the original image. Simplify all details into clean, flat shapes with a ' +
      'handmade, slightly imperfect feel, as if drawn on a sheet of white paper. The ' +
      'overall style should look cute, childlike, and whimsical',
    model: 'ChatGPT',
    date: '2026-06-18',
    type: 'image',
    src: 'https://media.fei.io/lab/prompted/folk-flat-illustration.webp',
  },
];

/** Newest-first. Pure so it's unit-testable with fixtures; does not mutate the input. */
export function sortNewestFirst(items: PromptedItem[]): PromptedItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

export const promptedByDate = (): PromptedItem[] => sortNewestFirst(promptedItems);

/**
 * Cloudflare Image Transformations, inserted into a media.fei.io URL:
 * https://media.fei.io/foo/bar.webp -> https://media.fei.io/cdn-cgi/image/width=640,quality=80,format=auto/foo/bar.webp
 * Falls back to the source URL unchanged if it isn't parseable.
 */
export function thumbUrl(src: string, width = 640): string {
  try {
    const url = new URL(src);
    url.pathname = `/cdn-cgi/image/width=${width},quality=80,format=auto${url.pathname}`;
    return url.toString();
  } catch {
    return src;
  }
}
