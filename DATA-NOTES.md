# DATA-NOTES — ingest conflict resolutions

Generated 2026-10-22T10:30:53.871Z by `scripts/ingest.mjs`. Newer/corrective sources win on overlap; nothing was invented (missing → null). Nickname id = sha1(entityId + '::' + normalized text)[0:16]; normalized = lowercase, single-spaced, trimmed. Re-running ingest never deletes votes: votes key on nickname id.

## Entity IDs

- Entity id is `<type>:<key>` (e.g. `character:ganyu`) so identical keys across types can never collide.
- Display names: characters from research headings (fallback: prettified key); artifacts/weapons from their JSON inventories. Character imageUrl is always null (no image data in research).

## Resolutions (every conflict)

- **emilie / escoffier have zero research coverage**: created as entities with zero nicknames (display names fall back to prettified keys); they enter the "Help us find names" queue. No names invented.
- **character sections with no usable candidates (24)** → zero-nickname help-queue entities: aino, aloy, alyosha, amber, charlotte, chasca, chiori, dahlia, emilie, escoffier, flins, gorou, iansan, illuga, kaeya, lauma, linnea, lohen, lyney, manekin, manekina, odette, xiao, yunjin.
- **title/lore/official-name rows excluded, never ingested as nicknames** (e.g. Traveler for aether, Tianquan for ningguang, Lelek for odette, Amy/full-name rows, yunjin/zibai title tables, Divine Priestess for kokomi).
- **corrective-silken-song is additive**: SMS/[Silken Moon] added to silkenmoonsserenade, SDP/SoDP added to songofdayspast; nothing replaced.
- **batch-6 misnumbering resolved by Exact key, never by heading number**: headings 51–60 mapped to true keys tenacityofthemillelith…vermillionhereafter + wandererstroupe (true 53–61,63).
- **viridescentvenerer duplicated in batch-6 + batch-7 merged**: unioned from aritfacts/artifact-set-nickname-research-batch-6.md, aritfacts/artifact-set-nickname-research-batch-7.md; "OC" for obsidiancodex kept as technical-only (single-source, preliminary).
- **wandererstroupe duplicated in batch-6 + batch-7 merged**: unioned from aritfacts/artifact-set-nickname-research-batch-6.md, aritfacts/artifact-set-nickname-research-batch-7.md; "OC" for obsidiancodex kept as technical-only (single-source, preliminary).
- **weapons precedence: union, not replacement**. All 26 batch JSONs + recheck + original report unioned per key; every nickname kept with its file in provenance and its own researchConfidence ("preliminary" stays "preliminary"); identical normalized texts dedupe, keeping all sources. Voting decides.
- **calamityofeshu / CoE**: recheck says found-preliminary (snippet only, Cache miss) while batch-04 says not stated → kept as a separate preliminary candidate (provenance: recheck).
- **beyondthechrysalis / chrysalis**: original report has no section; recheck says not stated; batch-03 says found ("working towards R5 Chrysalis") → kept as a medium candidate (provenance: weapons-batch-03.json).
- **weapons keys where sources attest DIFFERENT nickname texts (24)** — all kept as separate candidates:
  - cashflowsupervision: Cashflow Blackhole · cashflow
  - favoniuscodex: Fav Codex · Fav
  - favoniusgreatsword: Fav Greatsword · Fav
  - favoniuslance: Fav Lance · Fav
  - favoniussword: Fav sword · Fav
  - favoniuswarbow: Fav Bow · Fav
  - fleuvecendreferryman: The Pipe · Pipe · Pipe Sword
  - fruitfulhook: FH · fruit hook
  - gestofthemightywolf: Gest · Mighty Wolf
  - hakushinring: HR · Hakushin
  - harangeppakufutsu: HGF · Haran
  - lostprayertothesacredwinds: LP; Lost Prayer · LP · Lost Prayer
  - luxurioussealord: fish claymore; Tuna · Fish Claymore; Tuna Fish Claymore · Fish Claymore
  - sacrificialbow: Sac · Sac Bow
  - sacrificialfragments: Sac frags · Sac · Sac frag
  - sacrificialgreatsword: Sac great swords · Sac · Sac Greatsword · Sac GSword
  - sacrificialsword: Sac sword · Sac · Sac Sword
  - songofbrokenpines: SoBP · Broken Pines · Pines · SotP
  - staffofhoma: SOH · Homa
  - summitshaper: Summit · SS
  - swordofnarzissenkreuz: Shiny Dull Blade · 4-star Dull Blade
  - theviridescenthunt: VH · Budget Venti
  - thrillingtalesofdragonslayers: TTDS · TToDS
  - ultimateoverlordsmegamagicsword: UOMMS; Melusine Sword; Cardboard · Melusine sword
- **shared shorthand collisions preserved per key, never merged**: Fav (several Favonius weapons), FH (batch-8: fracturedhalo + fruitfultheory), MW (batch-11: missivewindspear + mitternachtswaltz), Donut (everlastingmoonglow + jadefallssplendor per other-agent note), WGS (waster/gravestone ambiguity noted in original batch 25).
- **researcher joke/misspelling exclusions honored** (never ingested): "cursed sword" (aquilafavonia), "doo doo balls" passive joke, "jade ball" description, "Breezeborne Bow" descriptive shortening, "Ailey hunter" misspelling, "Amenoma Lite" (other weapon), BCS/BCW database-only shorthands, "etherlight" truncation, "club" descriptor.
- **drifting confidence labels collapsed to high / medium / preliminary / unknown**: Strongly supported/Recurring/High/verified/explicit/readable → high; Moderate/Medium/Attested/Context-limited → medium; Weak/Low/one-off/joke/snippet/Cache-miss/402/unverified → preliminary; else unknown.

## Quote policy

- Quotes only from explicit `Quote:` fields (weapons/artifacts batch-1). Character/artifact evidence prose is NOT quoted (quote stays null); the section's URLs land in `sources` with the file in `provenance`.

## Parse failures

- none
