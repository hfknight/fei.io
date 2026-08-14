# Writing drafts

Mirrors of the published posts (source of truth is D1; edit there via /writing/admin or ask Claude).

---

## The rebirth of this website

*Published 2026-08-12 · slug: the-rebirth-of-this-website · mirror of the D1 body*

I built my first personal website in 2011, on my first MacBook, right before graduation, with nothing but plain HTML, CSS, and JS. The [Web Archive](https://web.archive.org/web/20110221053616/http://hfknight.com/) is all that survives of it, along with a handful of blog posts I wrote on and off in the years after. Digging them out and rereading them now, the old days flash by and nostalgia floods in. A decade of my life, sitting quietly in the dust of internet history.

I tried to redesign it a few times over the years. None of them shipped: either I got distracted by something else, or it didn't meet my bar.

The real push came early this year. Generative AI was soaring, and the ease of vibe coding made my procrastination no longer an excuse. So I finally launched [a new version](https://f22d8f1a.fei-io.pages.dev), hyped about video generation, built with Claude Code, full of ideas I'd been wanting to try.

And now the latest version is live, where I pushed my limits again to make something fun that finally matches my aesthetic. Land on the homepage and you meet my two pets: Jojo on the light half, Ollie on the dark, each in a video that scrubs to follow your cursor. Two glass lenses sit at the bottom of the page. Drag one around and hidden layers surface under it, refracted through the glass: the route my life took from my hometown to Beijing to Shanghai to Dallas, the local time and my mood of the day, the stacks I build with orbiting my titles. There's a [/lab](https://fei.io/lab) for cool experiments that don't fit anywhere else, and this post is served from [/writing](https://fei.io/writing), a little blog I wired up on Cloudflare.

I'm proud of it. Maybe someday I'll get bored again and design the next one, who knows. For now, let's just enjoy the shiny new thing :P

Cheers, see you starside (IYKYK).

---

## fanmatchday.com: a postmortem

*Published 2026-07-30 · slug: fanmatchday-postmortem · mirror of the D1 body*

This summer I built and ran [fanmatchday.com](https://fanmatchday.com), a matchday planner for World Cup 2026. Tell it your hotel and your match, and it gives you a door-to-door plan: when to leave, which train, whether your backpack clears FIFA's bag rules, whether it'll be 100°F at kickoff. Eleven US host stadiums, 78 matches, English and Spanish, all running on Cloudflare's edge. I did the design, the engineering, the content, and the infra, solo.

The tournament is over now, and so is the experiment. Here's the honest accounting.

## The problem was real

A fan flying into a host city faces a genuinely scattered logistics question. The answers live across a stadium's website, a host-city transport page, a transit agency PDF, and FIFA's code of conduct, and they change per stadium, per match, per language. Collapsing that into one page felt worth building, and the search data later proved people were asking exactly these questions: `bellevue to lumen field`, `sofi stadium to santa monica`, `mia to hard rock stadium`. The demand thesis checked out. Hold that thought.

## The architecture I'm still proud of

Every plan body is written by an LLM against a per-stadium knowledge base I curated: 242 markdown entries covering transit, parking, bag policy, weather, food. The core decision was what to cache: the plan is generated on a coarse key (stadium, match, origin area, language), and anything truly hotel-specific gets layered on at render time: your hotel's name is substituted into the cached prose, and a live ETA strip fetches real Google Directions data for your actual coordinates. One paid generation serves every hotel in a neighborhood; every fan still sees times computed from their own doorstep.

The paranoid part paid off most. A site with ~1,600 indexable URLs, each backed by a paid LLM call, is a bill waiting to happen. So generation was gated behind a whitelist crawlers can't route around, the cache TTL adapted to the weather forecast window, and finished matches short-circuited before ever touching the cache. Then the traffic data came in: **about a third of all page views were named crawlers**. BingBot alone rivaled my human audience. Every one of those hits landed on a route whose content is LLM-generated, and thanks to the gates, the whole crawler army cost me effectively nothing, on a free-tier zone. Building for adversarial load before seeing it was the best engineering call in the project.

## The number that told the truth

The product shipped complete and ran through the entire tournament without incident. It also never took off, and the telling number isn't the volume, it's the shape. **Traffic stayed flat through the tournament itself**, the exact five-week window the whole thing was built for. Google sent 42 clicks in three months. A product catching its moment shows a rising curve through that moment; mine drew a horizontal line through it.

And here's the uncomfortable part: the SEO *worked*, technically. 122 of my long-tail origin pages got indexed and earned a third of all clicks. Spanish drove 29% of impressions. The bilingual build wasn't decorative. All 11 stadiums surfaced in search. The pages ranked for precisely the queries they were designed to answer... at positions 19 to 28. Pages two and three. Impressions, no clicks. A ten-week-old domain competing against FIFA, ESPN, and every host city's tourism board doesn't lose on relevance. It loses on authority, and authority compounds on a six-to-twelve-month curve. I had four weeks before kickoff.

## What I'd do differently

The lesson isn't "SEO is bad." It's that **I picked a compounding channel for a time-boxed event.** For a tournament, users were sitting in fan subreddits, supporters' Discords, and ticket-resale threads that whole time, channels with zero maturation curve. SEO should have been the secondary bet.

The deeper mistake was sequencing. I built ~1,600 indexable pages before I had evidence that organic search could deliver a single user in time. Validate the channel, then scale the surface it feeds. I did it backwards, and executed the backwards version really well.

And I saw the flat curve two weeks into the tournament, with ~25 days of peak demand still on the table. That was the moment to drop SEO refinement and go knock on community doors. I didn't. The graph was telling me the truth and I gave it time to change its mind instead.

## What I'd keep

All of the architecture. The cost gates, the adaptive cache, the transit-profile modeling, the split between coarsely-cached prose and live per-hotel ETAs: everything held up under real traffic and a real crawler siege, and it would have scaled without changes if the users had come. Being left with "the system works, the funnel didn't" is a much better failure than the reverse.

The site is still up, every match politely marked as completed. The 2030 World Cup is in Spain, Portugal, and Morocco. If I go again, the code is ready. This time the marketing goes first.

---
