# Finding Efficiencies in HLS Production

A 37-slide [Slidev](https://sli.dev) deck in the ODSI style. With the full LaSRC
section it runs about 43 minutes; see the timing note below. The
audience is NASA managers and leads of other SNWG solutions.

## What the deck argues

After six years of running HLS, we know where the money goes. In 2025 the
AWS bill was about $450k gross, and 53% of it was EC2 compute. We are
cutting cost in two places:

1. **Modernizing LaSRC.** Porting the legacy C science code to Rust with AI
   coding agents was a 5–6 month job nobody could prioritize. With an
   automated validation suite (353 granules × 7 bands, all within 5 DN) as
   the check, it became practical. The result is 30% faster with 7% less
   memory. Slides 6–24 are copied verbatim from the LaSRC Rust talk (its slides 2–24 except 6, 8, 22 and 23).
2. **Next-generation infrastructure.** An event-driven design with S3 as the
   log replaces Step Functions polling and the RDS log database.
   Orchestration drops from about $20,160 a year to about $200. A full
   30M-granule reprocessing drops from $55–85k to about $4.1k.

The last part of the talk turns these into patterns and questions other
SNWG solutions can apply to themselves, and invites them to talk to us. AI
is credited for what it did: it accelerated the Rust port, and Claude was
the coding assistant for the new architecture prototype. The validation
suite and the engineers made the results trustworthy.

No slide or speaker note names another solution as having a problem. Slide
36 names downstream users of HLS only, to show that HLS gains flow on to
them. `npm run lint` enforces this.

## Slides

| Act | # | Slide |
|---|---|---|
| Setup | 1 | Finding Efficiencies in HLS Production (title) |
|  | 2 | HLS at a glance |
|  | 3 | Why now |
|  | 4 | What we set out to improve |
| Part one: LaSRC | 5 | Modernizing LaSRC (section) |
|  | 6 | Where LaSRC sits in HLS |
|  | 7 | Why we chose ESPA |
|  | 8 | Science code is not production code |
|  | 9 | The ESPA LaSRC C Codebase |
|  | 10 | What makes a system "production" grade? |
|  | 11 | A community driven atmospheric correction model |
|  | 12 | Why Rust |
|  | 13 | So why had we not done it? |
|  | 14 | Agents to the rescue |
|  | 15 | The loop |
|  | 16 | A strong foundation, not a finished port |
|  | 17 | The testing suite we have always needed |
|  | 18 | What the suite actually does |
|  | 19 | What one comparison looks like |
|  | 20 | Humans in the loop |
|  | 21 | Four main classes of issues |
|  | 22 | Sometimes the model's choices were more correct than the ESPA codebase |
|  | 23 | Where we are now |
|  | 24 | What is next, in priority order |
| Part two: infrastructure | 25 | Next-generation infrastructure (section) |
|  | 26 | What hurts in the current system |
|  | 27 | Event-driven, with S3 as the log |
|  | 28 | Orchestration cost, line by line |
|  | 29 | Paying to ask "are you done yet?" |
|  | 30 | A full reprocessing campaign |
|  | 31 | Questions we can now answer |
|  | 32 | Proven, then phased |
| Part three: other SNWG solutions | 33 | Applying this to other SNWG solutions (section) |
|  | 34 | Patterns we see |
|  | 35 | Questions to ask about your own system |
|  | 36 | HLS gains carry downstream |
|  | 37 | What we'd like you to take away |

Every slide has speaker notes ending in a `Sources:` line. The LaSRC slides
(6–24) and their notes are copied verbatim from
developmentseed/lasrc_rust_presentation, slides 2–24 except slides 6, 8, 22 and 23. Two
additions: card E on slide 9 (adding GDAS to the C code), drawn from
slides 6 and 8; and slide 23 carries the "Why this number matters" card
and note from the original's performance slide. The notes total about
5,980 words, about 43 minutes at 140 words a minute: setup 3.8, LaSRC 27.5,
infrastructure 7.1, SNWG 4.4. That is well over the 20–25 minute slot, so
part one needs cutting, either slides or the spoken script.

## Before presenting

Each item below is a dashed "Sean: …" box on the slide itself. Resolve it,
then remove the box.

- [ ] **Slide 30:** the cost analysis gives $4.1k for reprocessing in one table
      and $2.7k in another. Confirm which. $4.1k also appears on slide 37
      and in this README, and is pinned on both slides in
      `scripts/deck-rules.json`; change all of them together.
- [ ] **Slide 37:** what exactly we offer (reviews, office hours, shared
      templates) and contact details.

Two open questions without a box on any slide:

- **Slide 34 rows 2, 3 and 5** (long jobs on on-demand instances, always-on
  servers, homemade audit scripts) are evidenced by one team's public code
  only (see `docs/research/snwg-solutions.md`). With that team in the room,
  decide whether to keep, generalize or drop them.

- **The Jul→Dec drop in 2025 monthly spend.** The deck doesn't use it.
  If someone asks, know the cause.

## Running locally

Requires Node 18+.

```sh
npm install
npm run dev        # http://localhost:3030
```

- Presenter view with speaker notes: http://localhost:3030/presenter/
- Overview of all slides: http://localhost:3030/overview/

## Checks

```sh
npm test                  # unit tests for the lint's checks
npm run lint -- --final   # deck rules, see below
npx slidev slides.md --port 3031 &
npm run overflow          # nothing outside the frame, clipped, or too small
```

`scripts/lint-deck.mjs` checks `slides.md` against `scripts/deck-rules.json`:

- exactly 37 slides, with their `routeAlias` values in order
- every note has at least 40 words and a `Sources:` line
- no em dashes
- no other SNWG solution named in any note, or on any slide except 36
  (case-insensitive, so repo slugs like `opera-sds-pcm` are caught too)
- the headline figures (pins) are present on every slide that uses them
- no phrase that misstates the evidence (`forbid` in the rules), e.g.
  savings stated as already achieved
- every workflow in `.github/workflows/` runs only on `workflow_dispatch`

`scripts/check-overflow.mjs` (Playwright) loads each slide from the dev
server. It reports elements outside the slide, content clipped by
`overflow: hidden`, and SVG text under 11px.

## Exporting

```sh
npx slidev export slides.md --output slides.pdf                 # 37 pages
npx slidev export slides.md --format png --output png           # one PNG per slide
```

A current `slides.pdf` is committed.

## Publishing is manual

The deck contains NASA AWS cost figures and an unmerged architecture design
(hls-nextgen-orchestration PR 7). The GitHub Pages workflow
(`.github/workflows/deploy.yml`) only runs when started by hand
(`workflow_dispatch`). Get clearance before you run it or share the PDF
outside the team.

## Sources

- `HLS_MCP_costs_breakdown_2025.csv`: 2025 AWS spend by service. It is
  kept out of git.
- `Outline.md`: the original talk outline. It is kept out of git.
- [developmentseed/lasrc_rust_presentation](https://github.com/developmentseed/lasrc_rust_presentation):
  the LaSRC port story, the agent loop, and the performance figures.
- NASA-IMPACT/hls-application, `lasrc_validation/notebooks/LaSRC_container_validation.ipynb`:
  the validation run of 2026-09-22. The figures in `public/images/` come
  from it.
- hls-nextgen-orchestration PR 7, `docs/orchestration-design.md` and
  `docs/cost-analysis.md`: the new design, the polling and reprocessing
  costs, and the rollout.
- `docs/research/snwg-solutions.md`: research on SNWG solutions, which
  backs the patterns and downstream slides. It records evidence and
  confidence for each pattern.
- Design and plan: `docs/superpowers/specs/2026-11-02-hls-efficiencies-deck-design.md`,
  `docs/superpowers/plans/2026-11-02-hls-efficiencies-deck.md`.

## Editing

- Slides are separated by `---`. In each slide, `# H1` is the small uppercase
  kicker and `## H2` is the serif heading. Each slide's `routeAlias` is its
  name in the lint rules.
- Layouts in `layouts/`: `odsi` (white content), `odsi-title`,
  `odsi-section` (navy section opener), and `odsi-dark` (navy content, used
  for the takeaways).
- `styles/odsi.css` is the ODSI theme (`card`, `chip`, `band`, `ba`, `stat`,
  `steps`, `ask`, `fig`/`credit`, `todo`). `styles/index.css` has this
  deck's components: `statrow`, `spendbar`, `flowdgm`, `hbar`, `pairs`,
  `checklist`, and, under `.lsrc`, the original LaSRC deck's CSS at its
  own scale, so the verbatim slides look as they did there.
- `package.json` pins `fuse.js` to 7.1.0 through `overrides`, because newer
  versions make Slidev's "go to slide" menu show all the time.
- The ODSI logo is white, so use it only on navy slides.
