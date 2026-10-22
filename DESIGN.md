# DESIGN.md — chosen direction: dark editorial / cinematic (Concept C)

## Verdict
Build **C**, with structure borrowed from A (tray chips with verdict marks,
clear entity header) and B (chunky press-down vote targets, sticker-like
commit stamps). Prototypes: `design/concepts/{a,b,c}.html` (+ `-mobile` /
`-desktop` shots).

## Honest critique
| Concept | What works | What kills it |
| --- | --- | --- |
| A bounty-board | Warmest read; card + tape + pin charming; mobile stacks cleanly | Safest = most generic-adjacent; closest to the discarded WIP (nostalgia, not progress); desktop rail composition unfinished (tray overflow) |
| B neo-brutalist | Most fun per flick; biggest targets; desktop grid holds together | Noisiest (sticker + chips + banner fight); casino-adjacent; light theme strains night voting; "SET 03" jargon |
| **C editorial (chosen)** | Unmistakable; rules-instead-of-cards dodges the card-stack cliché by construction; ember accent is element-driven (a system, not a color); Anton-vs-Cormorant is a real shout/whisper pairing | Hero eats 390px vertical space; dim text contrast too low as mocked; vote row needs stronger affordance |

C is the only direction no other voting tool looks like, and its risks are
all fixable with tokens (contrast floor, compact hero, bordered vote row) —
so they become M3 acceptance criteria, not open questions.

## Tokens
- `--bg: #0b0a08` (near-black, warm) · `--surface: #141210` · `--ink: #f2ede3`
- `--dim: #a39a89` (contrast floor — mock's #8f887a was too low, fixed)
- `--ember: #ff5a2a` (primary, Pyro today) · `--gold: #ffb03a` (heard/whisper)
- Signals: `--heard: #8fd18a` · `--never: #ff7a6b` · `--unsure: #8fb4cc`
- Element rails (dots/edges only, never fills): pyro #ff5a2a · hydro #38bdf8 ·
  anemo #5eead4 · electro #b28dff · dendro #a3e635 · cryo #bae6fd · geo #e3b341
- Type: Anton (shout: nicknames, numerals) · Cormorant Garamond italic
  (whisper: questions, quotes) · system sans, letterspaced (labels, kickers)
- Spacing 4px base / 8px rhythm; radius: 2px rules, 10px stamps, 14px sheets;
  shadows: double-layer, ember glow only on commit (`0 0 34px rgba(255,90,42,.35)`)
- Grain: fixed SVG-noise overlay ≤0.5 opacity; ember radial light 60%×45% top

## Motion (from M1: M3 easing + Apple HIG + Emil rules)
- Drag: 1:1 tracking, grab offset, springs `damping 1.0` default / `0.8` on
  flick, velocity handoff at release, rubber-band past bounds
- Commit stamp: slam `180ms ease-out` from `scale(0.95)` + opacity (never
  from 0); exits `200ms` (faster than entrances `400ms`); counter roll on
  summary; press `scale(0.97)` on `:active` + pointerdown feedback
- `prefers-reduced-motion`: crossfade only, no springs/slides; hover gated
  behind `(hover:hover) and (pointer:fine)`; transform/opacity only

## Icons / art plates
- Lucide only, 1.5–2px stroke; no emoji icons anywhere
- Entity art: hotlinked `images.mihoyo_icon` (200 ✔) → hoyolab-avatar
  fallback → designed plate (monogram + element glyph + rail color);
  lazy + blur-up + onError; weapons/artifacts default to plates until
  coverage is verified in M3

## Ban compliance
No purple/blue gradients, no glassmorphism, no emoji, no uniform
rounded-2xl cards, no centered-everything (left-aligned editorial grid), no
default shadcn skin (primitives restyled to tokens), no Inter-on-dark,
no filler copy (all strings written for the field-record voice).

## M3 build list
`src/styles/tokens.css`, tailwind theme mapping, restyled primitives
(button/chip/input/sheet/stamp), `/styleguide` route, hero-compact +
contrast-floor + vote-affordance fixes, art-plate component.
