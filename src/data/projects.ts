/* The side projects, as pure data. Its own module rather than a const in About.tsx because two
   readers want it: the /readme page renders it, and the /readme edge head (functions/readme.ts)
   lists the same projects as structured data, so a crawler is told what a visitor is shown from
   one source. The Workers build typechecks this file with no DOM lib, so it stays free of React,
   styled-components and anything else that would drag one in. */

export interface Project {
  name: string;
  blurb: string;
  year: string;
  kind: string;
  /* The RESTING PANEL's picture, shown as a tilted plate (see PanelShot).

     Captured at a ratio of about 0.8 — a desktop-WIDTH window that is taller than it is wide —
     and that figure is the useful part of this comment. The front page is a full-height grid,
     so its window's proportions decide the shape of the picture, and the two ends of the range
     are both wrong. A normal 1.6 landscape leaves the panel showing nine tenths of a single
     card, because the panel is steeply portrait and cover has to fill it. Going all the way to
     the panel's own aspect (~0.43) fills it with the page entire, but stretches the grid until
     its cards are enormous and it stops reading as a desktop site. 0.8 keeps the three-column
     layout looking like itself while giving the crop nearly two cards to work with. */
  image?: string;
  /* The same front page, captured LANDSCAPE (~1.6), for the opened split's wide pane.

     Two captures of one page, and the reason is the two slots' proportions rather than anything
     about the page: the panel is steeply portrait and the pane is landscape, so the ratio that
     serves one crops badly in the other. The pane is roughly the shape a browser window is, so
     it takes the shot at roughly a browser's ratio and shows the front page more or less whole —
     which is the point of the opened view, where there is room to look at it properly. */
  imageWide?: string;
  /* The tall screenshot — a desktop capture run down a long interior page. Used ONLY in the
     opened split, as the narrow pane, where fitting a smaller width makes it run past the
     bottom and so show more of the site. Nothing falls back to anything here: the split plays
     its two panes against each other, so it wants imageWide and imageTall both or neither
     (see Detail).

     EVERY capture needs a browser with WEBGL, and one that has been DRIVEN. Two traps, both of
     which produce a screenshot that looks fine until you hold it next to the real site:

     1. The background is a WebGL canvas (canvas.lp-fluid — the green dot matrix behind the
        cards). Headless Chrome run the obvious way, with --disable-gpu, renders it empty and the
        capture comes back on flat black. Use --enable-unsafe-swiftshader and no --disable-gpu.
     2. The matrix is a FLUID, fed by pointer motion. With no pointer it decays to almost
        nothing, so `chrome --headless --screenshot` can never catch it however long it waits —
        the page has to be driven. Sweep the mouse across the viewport, then PARK IT OFF THE
        CARDS before shooting: leaving it over one holds that card in hover, which dims every
        other card's artwork. The hover releases in a few hundred ms; the fluid outlives it.

     Check for the green, and for all five cards being lit, before trusting a recapture.

     GEOMETRY, which is not guessable from the file and cost a wasted capture to rediscover:
     this is a DESKTOP capture DOWNSCALED, not a narrow viewport. Shoot the full page at 1400
     CSS wide at DPR 2, then resample the result to 900px wide. Shot at 450 instead — the width
     the finished file implies — the site serves its stacked mobile layout and the page comes
     out nearly five times longer. The 1400 is recoverable from the asset if it is ever lost
     again: the height that width produces, scaled to 900, is what the file already is. */
  imageTall?: string;
  /* The longer copy for the detail view. Falls back to `blurb` when absent, so a project
     can ship with one line and gain a paragraph later. */
  detail?: string;
  /* A walkthrough, shown in a phone frame where the split would otherwise be (see Detail).
     This is the THIRD thing the detail can show, after the two-shot split and the bare skin,
     and which one a project gets is decided by what it carries rather than by a mode flag.

     Two encodes, and the pair is the point: the webm is AV1, both smaller and higher fidelity
     than the mp4, but Safari only decodes AV1 where the hardware can. Declared first, so
     everything that can take it does and the rest fall through to H.264 — which is the only
     reason to ship the larger file at all. Both or neither; a lone mp4 would work but would
     serve twice the bytes to every browser that never needed it.

     `image` doubles as the poster, so it wants to be a frame of the same capture at the same
     size — otherwise the handover from poster to first frame is a visible jump. */
  videoWebm?: string;
  videoMp4?: string;
  /* A picture behind whatever the detail stages in its media column — for now the phone. The
     stage's default is one soft pool of light (see MediaStage); this replaces it where the
     project has a WORLD worth putting the object in rather than just empty room. It is scenery
     and gets treated as such: heavily damped, so it stays behind the device instead of becoming
     the thing you look at. */
  backdrop?: string;
  /* The project's id in the Obsidian community registry, where a plugin's install numbers are
     public. Carried as the ID rather than as a flag because it IS the key the endpoint looks up
     — one string, and the detail asks for the numbers only where there are numbers to ask for.
     See functions/api/plugin-stats. */
  pluginId?: string;
  /* An app tile in place of a capture — for a project whose face is a MARK rather than a
     screen. A plugin has no interface of its own worth photographing: what it puts on screen is
     a note inside someone else's application, so a capture would mostly be that application.
     The tile is what the thing looks like where you actually meet it, in a plugin directory.

     A key rather than a component, so this array stays data. See AppTile. */
  tile?: 'bookmark';
  /* Where the thing actually is, shown in the detail (see DetailLink). The label is DERIVED
     from this rather than carried beside it, so there is one string to keep true and no way for
     the two to disagree — and what a reader wants from a portfolio link is the destination, not
     a verb. For the two sites that makes it a near-repeat of the name above, which reads as
     confirmation rather than as redundancy; for the plugin the host is the more useful half,
     since it is what says the thing is listed rather than self-published. */
  url?: string;
  /* Set when `image` is a capture of a LIGHT interface. The panel's three layers — plate, veil,
     shim — were tuned against game key art and white UI type on a dark page, which is bright in
     places but dark overall. A near-white app screenshot is not: at full strength it turns its
     panel into a lit rectangle in a row of dark ones, and the name over it stops reading.

     Declared per project rather than fixed in the scrim because it is a fact about the SOURCE,
     not a preference — and a heavier scrim for everyone would flatten the captures that are
     already dark. See PanelShot for what it does. */
  lightCapture?: boolean;
  /* The schema.org type the /readme edge head lists this project under (functions/readme.ts).
     Declared per project, by the lab's rule that each thing carries the type that actually
     describes it: a content site is a WebSite, a tool you operate is a WebApplication, and
     something you install is a SoftwareApplication. */
  schemaType: 'WebSite' | 'WebApplication' | 'SoftwareApplication';
}

/* The featured set is deliberate and small. The row's widths, the wipe and the hover
   measurement (PANEL_HOVER_W) are all tuned for this many panels, so promoting a project from
   LISTED_PROJECTS is a decision about the whole composition, not a reorder of an array. */
export const FEATURED_PROJECTS: Project[] = [
  {
    name: 'videogamers.fyi',
    blurb: 'Tells you what a game is right now, not what it was at launch.',
    detail:
      'This website answers one question: is this game worth it right now? Most game ' +
      'coverage is frozen at launch — here, player counts and patch data refresh every six ' +
      'hours, community sentiment daily, the verdict itself weekly. Nothing reaches a page ' +
      'unsourced: verdicts link out to the timestamped player reviews behind them, so any ' +
      'claim can be checked. It targets the questions that go stale fastest: is it dead, is ' +
      "it fixed, is it worth this price, is it the better pick over the one you're also " +
      'weighing. It runs end to end without an editor — I choose which games it covers, the ' +
      'pipeline does the rest.',
    year: '2026',
    kind: 'Automated gaming site',
    url: 'https://videogamers.fyi',
    schemaType: 'WebSite',
    image: '/warmind-home@2x.webp',
    imageWide: '/warmind-home-wide@2x.webp',
    imageTall: '/warmind-game@2x.webp',
  },
  {
    name: 'fanmatchday.com',
    blurb:
      'Plans your FIFA World Cup 2026 matchday, hotel to kickoff, in about thirty seconds.',
    detail:
      'A matchday planner for World Cup 2026. Tell it your hotel and your match, and it ' +
      'gives you a door-to-door plan: when to leave, which train, whether your backpack ' +
      "clears FIFA's bag rules, whether it'll be 100°F at kickoff. Eleven US host stadiums, " +
      "78 matches, English and Spanish, all running on Cloudflare's edge. Every plan is " +
      'written by an LLM against a per-stadium knowledge base I curated: 242 entries ' +
      'covering transit, parking, bag policy, weather, and food. Plans are generated and ' +
      'cached on a coarse key (stadium, match, origin area, language), then personalized at ' +
      'render time: your hotel goes into the cached prose, and a live strip fetches real ' +
      'driving and transit ETAs from your actual coordinates. One paid generation serves a ' +
      'whole neighborhood of hotels; every fan still sees times from their own doorstep.',
    year: '2026',
    kind: 'World Cup 2026 planner',
    url: 'https://fanmatchday.com',
    schemaType: 'WebApplication',
    image: '/fanmatchday-home@2x.webp',
    lightCapture: true,
    videoWebm: '/fanmatchday-walk.webm',
    videoMp4: '/fanmatchday-walk.mp4',
    backdrop: '/fanmatchday-bg@2x.webp',
  },
  {
    name: 'X Bookmarks Sync',
    blurb: 'Saves your X bookmarks into Obsidian as real notes, with no API key.',
    detail:
      'Sync your X (Twitter) bookmarks directly into your Obsidian vault as clean, ' +
      'structured Markdown notes. No API key. No OAuth. Just your existing browser session. ' +
      'It runs in an embedded webview against the session you already have, and reads your ' +
      'bookmark list directly rather than scrolling the page, so a large library syncs ' +
      'quickly. Each run confirms it actually reached the end of the list; when it cannot, ' +
      'the next one re-scans in full rather than assuming. Sync incrementally, pick from a ' +
      'checklist, or pull the full body of a long-form X article into its note.',
    year: '2026',
    kind: 'Obsidian plugin',
    url: 'https://community.obsidian.md/plugins/x-bookmarks-sync',
    pluginId: 'x-bookmarks-sync',
    schemaType: 'SoftwareApplication',
    tile: 'bookmark',
    /* Not a capture — there is nothing to capture (see `tile`) — but the same field, because
       it does the same job in both places: the resting panel's picture, which the detail then
       opens onto. Carrying it here rather than as a second backdrop key is what makes the two
       states continuous: the panel is already showing this sky when it is clicked. */
    image: '/xbookmarksync-bg2@2x.webp',
  },
];

/* Listed projects get no panel and no pictures: a row in the More panel's list, with its link
   in the DOM at rest. Where a project earns a panel is the note on FEATURED_PROJECTS. */
export const LISTED_PROJECTS: Project[] = [
  {
    name: 'dqmwitheredworld.com',
    blurb:
      'Finds every way to synthesize a monster in Dragon Quest Monsters: The Withered World.',
    detail:
      'An unofficial synthesis calculator for Dragon Quest Monsters: The Withered World. ' +
      'It works in both directions: pick two parents to see what they make, or pick the ' +
      'monster you want and see every recipe for it, traced down to monsters you can scout. ' +
      'A recipe only ships if two independent sources agree on it or Square Enix states it ' +
      'outright. Anything still unknown is shown as unknown, never guessed.',
    year: '2026',
    kind: 'Fan synthesis calculator',
    url: 'https://dqmwitheredworld.com',
    schemaType: 'WebApplication',
  },
];

export const ALL_PROJECTS = [...FEATURED_PROJECTS, ...LISTED_PROJECTS];
