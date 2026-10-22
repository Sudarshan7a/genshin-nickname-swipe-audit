# DESIGN-NOTES.md — M1 research (real browsing, 2026-10-22)

Moodboard: `design/refs/*.png` (10 shots, 1280×800). Fetched full text where
marked [full]; others from search snippets [snip] + screenshots. Apple HIG
page is JS-gated (fetch returned empty) — covered via the apple-design skill
+ search snippets instead.

## Swipe / card UX

1. Tinder swipe masterstroke — https://medium.com/design-bootcamp/why-tinders-swipe-interaction-was-a-ux-masterstroke-e583d5eddfd1 [full]
   - Steal: one profile at a time = near-zero cognitive load; direct
     manipulation (push the card, don't tap a "Like" button); instant color
     + motion feedback on commit; celebrate rare moments full-screen.
   - Avoid: anything that turns the deck into database browsing (lists,
     filters-first, paragraphs per card).

2. Reigns adaptive narrative — https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i- [full]
   - Steal: binary swipe carries weight when every flick has visible
     consequences; "toy with surprising depth"; players invent stories
     between unlinked cards — our per-card quotes feed that.
   - Avoid: pure randomness feels hollow after 10 min; keep progress,
     streaks, and summary causality visible so votes feel authored.

3. Mobile swipe patterns roundup — https://procreator.design/blog/mobile-app-design-patterns-boost-retention + https://www.eleken.co/blog-posts/mobile-ux-design-examples [snip]
   - Steal: swipe actions for speed, buttons as the discoverable twin of
     every gesture (our buttons + keys mirror drags).
   - Avoid: gesture-only interfaces; hidden affordances.

4. Mobbin card glossary — https://mobbin.com/glossary/card [full]
   - Steal: card = one visually distinct unit for related content; 12k-card
     study: elevated / outlined / filled / image containers are all legit —
     pick ONE container language and hold it.
   - Avoid: cards navigating where an action is expected; buttons inside
     every card (repetitive); nesting cards in cards.

5. Awwwards card-swipe inspiration — https://www.awwwards.com/inspiration/card-swipe-interaction-imagine-people [shot]
   - Steal: award-level swipes choreograph the whole frame (background,
     counter, next-card peek move together), not just the top card.
   - Avoid: WebGL excess that costs 60fps on mid phones.

## Best-in-class product UI

6. Linear 2026 refresh — https://linear.app/now/behind-the-latest-design-refresh [full]
   - Steal: "don't compete for attention you haven't earned" (chrome
     recedes, content leads); structure felt not seen (softer borders,
     fewer dividers); warm gray over blue-gray; feature-flagged rollout
     with in-app toggle for comparing directions.
   - Avoid: icon soup (they shrank + decolored icons); full-width tab bars.

7. Raycast — https://www.raycast.com/ + https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/raycast/DESIGN.md [snip]
   - Steal: Spotlight-overlay density (rounded keycaps, command rows, one
     accent); keyboard-first with visible hints.
   - Avoid: floating-panel chrome on a full-screen phone flow.

8. Stripe dashboard analyses — https://mattstromawn.com/projects/stripe-dashboard/ + https://medium.com/swlh/exploring-the-product-design-of-the-stripe-dashboard-for-iphone [snip]
   - Steal: embeddable components that match host look (our primitives must
     survive both deck and admin); data density without noise.
   - Avoid: dashboard gray — our surface must have a point of view.

9. Refero Linear system notes — https://styles.refero.design/style/90ce5883-bbcd-4466-9f7f-801ce1d7b0d1 [snip]
   - Steal: near-black + paper-white + ONE electric accent is a proven
     combo; document tokens as roles not hex.
   - Avoid: acid-lime itself (someone else's brand).

## Game feel / source material

10. Hoyoverse character pages — https://genshin.hoyoverse.com/en/character/mondstadt [shot]
    - Steal: elemental color coding per character; tall portrait plates;
      airy light fantasy tone as contrast reference.
    - Avoid: copying HoYoverse art direction wholesale (we hotlink icons
      only, never art; light theme fights our night-desk concept).

11. Persona 5 UI analysis — https://jiaxinwen.wordpress.com/2017/04/27/the-ui-design-of-persona-5/ [full]
    - Steal: menus AS identity (sharp angles, halftones, starbursts);
      commit to the fiction on every screen including pause/error states.
    - Avoid: P5's maximalism for a voting tool — steal conviction, not density.

12. Balatro feedback design — https://blakecrosley.com/guides/design/balatro [full]
    - Steal: the juice stack (card spring + counter roll + color pulse +
      rising-pitch ticks layered on one commit); color IS the label
      (blue chips / red mult — ours: green heard / red never / amber
      unsure); feedback proportional to significance; sequential
      activation teaches causality (our summary can pulse per answer).
    - Avoid: screen shake on phones (vestibular risk); CRT scanlines as
      identity (gimmick at our scale, plus perf cost).

13. Hades UX writing — https://medium.com/design-bootcamp/what-the-best-game-of-2025-teaches-us-about-the-design-of-literally-everything-else [snip]
    - Steal: menus as opportunities for theater (boon pick = our card
      commit); writing that respects the player's intelligence.
    - Avoid: dark-fantasy heaviness; our tone is fieldwork, not death.

## Galleries / component sources (adapt, never paste)

14. Dribbble trading-card searches — https://dribbble.com/search/trading-card-ui [snip]
    - Steal: foil/shimmer treatments, rarity color rails, oversized type
      on card faces.
    - Avoid: dribbble bait (unreadable microtype, fake buttons, casino
      energy).

15. 21st.dev + Aceternity cards — https://21st.dev/@manuarora700/library/aceternity-ui + https://ui.aceternity.com/blocks/cards [full]
    - Steal: 3D-tilt-on-hover vocabulary (translate to press-tilt on
      touch), expandable-card pattern for our flip-to-source.
    - Avoid: aurora backgrounds, sparkle particle soup, spotlight cards
      everywhere — the exact banned "AI slop" set.

16. Magic UI shine-border — https://magicui.design/docs/components/shine-border [full]
    - Steal: ONE animated border treatment, used sparingly (pending-sync
      indicator is the honest use).
    - Avoid: beams/marquees as decoration on a tool people use 100×/day.

## Motion + interaction principles

17. Material 3 motion — https://m3.material.io/styles/motion/easing-and-duration + https://m3.material.io/styles/motion/overview/how-it-works [full+snip]
    - Steal: exits faster than entrances (200ms out / 400–500ms in);
      emphasized-ease with snappy takeoff + soft landing; springs for
      gesture handoff; scale duration with travel distance.
    - Avoid: M3's longer durations verbatim on high-frequency votes —
      our commit stamps must land ≤300ms.

18. Apple HIG gestures — https://developer.apple.com/design/human-interface-guidelines/gestures [snip + apple-design skill]
    - Steal: respond on pointer-down; 1:1 tracking with grab offset;
      interruptible springs from the live value; velocity handoff at
      release; rubber-band boundaries; project flick landing spots.
    - Avoid: locking input during transitions; single-finger custom
      gestures that collide with scroll (our vertical deck vs page
      scroll needs the 10px hysteresis rule).

19. Laws of UX — https://lawsofux.com/fittss-law/ + https://www.nngroup.com/articles/fitts-law/ [full+snip]
    - Steal: 44px+ targets in the thumb zone (vote buttons bottom);
      Doherty Threshold <400ms per vote loop; Hick's law = 3 answers max.
    - Avoid: top-of-screen primary actions on 390px phones.

20. Refactoring UI (book knowledge, no browse needed)
    - Steal: hierarchy via weight/size/color, not boxes; one typeface
      with intent beats two without.
    - Avoid: gray-text-on-tint, tentative 1px-everywhere borders.

## Images (verified live)

- genshin-db API works: `https://genshin-db-api.vercel.app/api/v5/characters?query=hutao`
  returns `images.mihoyo_icon`, `images.hoyolab-avatar`, fandom card/portrait.
- HEAD checks: `upload-os-bbs.mihoyo.com` → 200 (0.23s) ✔;
  `img-os-static.hoyolab.com` → 200 ✔; `bbs.hoyolab.com/hoyowiki` → FAIL, avoid.
- Decision: hotlink `mihoyo_icon` (+ hoyolab-avatar fallback), lazy +
  blur-up + onError plate; never host art. Weapons/artifact icon coverage
  to be verified in M3 (likely monogram plates for most).

## Synthesis (one page)

The tool is a field instrument, not a feed: one question, one card, one
flick, hundreds of times. So the interface must behave like Balatro +
Reigns (every commit lands with layered, proportional feedback) while
looking like nothing in the gallery set. Tinder teaches the gesture
grammar; Linear teaches restraint (chrome recedes, the card leads);
Persona 5 teaches conviction (every state, even error/offline, speaks the
same visual language); M3 + Apple HIG give the numbers (≤300ms commits,
exits faster than entrances, interruptible springs with velocity handoff);
Fitts + thumb-zone put the verdict buttons at the bottom at 44px+.

That points at three honest directions for M2: A) bounty-board field
notes (paper, pins, ink stamps — closest to the old WIP, must prove it
isn't nostalgia); B) bold neo-brutalist trading cards (foil rails,
sticker stamps, big type — highest fun-per-flick risk of casino energy);
C) dark editorial / cinematic (large type, grain, element-colored light —
most distinctive, hardest to keep readable at 390px). All three share the
same motion spec and the same ban list: no purple/blue gradients, no
glassmorphism, no emoji icons, no default shadcn skin, no Inter-on-dark
with a gold accent, no filler copy.
