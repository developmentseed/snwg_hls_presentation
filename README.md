# Finding Efficiencies in HLS Production

A 23-slide [Slidev](https://sli.dev) deck, about 22 minutes long, in the ODSI style. The
audience is NASA managers and leads of other SNWG solutions.

## What the deck argues

After six years of running HLS, we know where the money goes. In 2025 the
AWS bill was about $450k gross, and 53% of it was EC2 compute. We are
cutting cost in two places:

1. **Modernizing LaSRC.** Porting the legacy C science code to Rust with AI
   coding agents was a 5–6 month job nobody could prioritize. With an
   automated validation suite (353 granules × 7 bands, all within 5 DN) as
   the check, it became practical. The result is 30% faster with 7% less
   memory, worth about $21–36k a year in EC2.
2. **Next-generation infrastructure.** An event-driven design with S3 as the
   log replaces Step Functions polling and the RDS log database.
   Orchestration drops from about $20,160 a year to about $200. A full
   30M-granule reprocessing drops from $55–85k to about $4.1k.

The last quarter of the talk turns these into patterns and questions other
SNWG solutions can apply to themselves, and invites them to talk to us. AI
is credited for what it did: it accelerated the Rust port, and Claude was
the coding assistant for the new architecture prototype. The validation
suite and the engineers made the results trustworthy.

No slide or speaker note names another solution as having a problem. Slide
22 names downstream users of HLS only, to show that HLS gains flow on to
them. `npm run lint` enforces this.

## Slides

| Act | # | Slide |
|---|---|---|
| Setup | 1 | Finding Efficiencies in HLS Production (title) |
| | 2 | HLS at a glance |
| | 3 | Why now |
| | 4 | What we set out to improve |
| Part one: LaSRC | 5 | Modernizing LaSRC (section) |
| | 6 | Science code is not production code |
| | 7 | The 5–6 month problem |
| | 8 | Agents plus a reference to check against |
| | 9 | The suite found what the agents missed |
| | 10 | Same output, faster and cheaper |
| Part two: infrastructure | 11 | Next-generation infrastructure (section) |
| | 12 | What hurts in the current system |
| | 13 | Event-driven, with S3 as the log |
| | 14 | Orchestration cost, line by line |
| | 15 | Paying to ask "are you done yet?" |
| | 16 | A full reprocessing campaign |
| | 17 | Questions we can now answer |
| | 18 | Proven, then phased |
| Part three: other SNWG solutions | 19 | Applying this to other SNWG solutions (section) |
| | 20 | Patterns we see |
| | 21 | Questions to ask about your own system |
| | 22 | HLS gains carry downstream |
| | 23 | What we'd like you to take away |

Every slide has speaker notes: a script of roughly 100–185 words, ending in a
`Sources:` line. The notes total about 3,160 words, about 22.6 minutes at 140
words a minute.

## Before presenting

Each item below is a dashed "Sean: …" box on the slide itself. Resolve it,
then remove the box.

- [ ] **Slide 7:** how long the agent-assisted port actually took (days or weeks).
- [ ] **Slide 16:** the cost analysis gives $4.1k for reprocessing in one table
      and $2.7k in another. Confirm which (the `reprocessing` pin in
      `scripts/deck-rules.json` expects $4.1k).
- [ ] **Slide 23:** what exactly we offer (reviews, office hours, shared
      templates) and contact details.

Two open questions without a box on any slide:

- **LaSRC share of runtime.** Slide 12 says LaSRC is "about half of
  Sentinel-2 runtime". Slide 10's $21–36k EC2 range assumes it. The
  Landsat share is unknown.
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
npm run lint -- --final   # deck rules, see below
npx slidev slides.md --port 3031 &
npm run overflow          # nothing outside the frame, clipped, or too small
```

`scripts/lint-deck.mjs` checks `slides.md` against `scripts/deck-rules.json`:

- exactly 23 slides, with their `routeAlias` values in order
- every note has at least 40 words and a `Sources:` line
- no em dashes
- no other SNWG solution named in any note, or on the patterns and
  self-check slides
- the headline figures (pins) are present on their slides
- the deploy workflow has no `push:` trigger

`scripts/check-overflow.mjs` (Playwright) loads each slide from the dev
server. It reports elements outside the slide, content clipped by
`overflow: hidden`, and SVG text under 11px.

## Exporting

```sh
npx slidev export slides.md --output slides.pdf                 # 23 pages
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
  `checklist`, and the loop SVG.
- `package.json` pins `fuse.js` to 7.1.0 through `overrides`, because newer
  versions make Slidev's "go to slide" menu show all the time.
- The ODSI logo is white, so use it only on navy slides.
