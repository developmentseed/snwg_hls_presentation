# Design: "Finding Efficiencies in HLS Production" deck

Date: 2026-11-02
Owner: Sean Harkins (Development Seed / ODSI)
Builds on: the ODSI Slidev template already in this repo (`slides.md`, `layouts/`, `styles/odsi.css`).

## Intent

A 20–25 minute talk to an audience of several senior NASA managers and many
leaders of other SNWG solutions. The audience is mixed. It leans non-technical,
but enough technical people will attend that slides can show real
architecture, benchmarks and cost tables.

The talk has two jobs:

1. **Showcase.** Show that the HLS team has modernized HLS production
   responsibly and is realizing real, measured cost and risk reductions.
2. **Invite.** Leave the SNWG leads thinking "we probably have the same
   problems, and these people have already solved them". Then get them to
   come to the HLS team for advice.

Success means that managers leave with two or three dollar figures they
remember, and solution leads leave with a reason to contact the team.

## Goals

- About 70% of the time on HLS (LaSRC modernization and next-gen
  infrastructure). About 25% on applying the lessons to other SNWG
  solutions. A short open and close.
- Lead every section with the outcome (dollars, risk, speed). Use the
  architecture and code as supporting evidence.
- Acknowledge, factually and lightly, the role of AI ("super intelligence" in
  the outline) in accelerating the work:
  - The LaSRC Rust port is the main credit. Multi-agent Claude Code sessions
    did the port, held to account by a reference output and a validation suite.
  - The next-gen architecture gets a light credit only. Claude was used as a
    coding assistant, and nothing more is claimed.
- Every number on a slide is traceable to a source listed in that slide's
  speaker notes.

## Non-goals

- Not a re-run of the full LaSRC Rust deck (27 slides). Condense it to about
  6 slides.
- Not a walkthrough of the full orchestration design doc (state machine, key
  schemas, Lambda by Lambda).
- No assessment of any specific SNWG solution on a slide.

## Anti-goals: what would make this a failure even if it "works"

- **Naming or critiquing another SNWG solution's architecture.** Problems are
  described as patterns, never attributed. The single exception is slide 22,
  which names solutions that *consume* HLS. It does so positively, as
  beneficiaries.
- **Overclaiming AI.** The talk must not imply that AI designed the system or
  that the port was trustworthy without the validation suite and human
  review. The LaSRC deck's own framing is the line to hold: "the critical
  ingredient was not the model, it was having a reference output".
- **Unsourced or inconsistent numbers** in front of managers.
- A lecturing tone toward peers. The SNWG section is an offer of help.

## Constraints

- Slidev, using the existing ODSI template in this repo. Use `# H1` as the
  kicker and `## H2` as the heading. The layouts are `odsi`, `odsi-title`,
  `odsi-section` and `odsi-dark`. Use the existing components: `card`,
  `chip`, `band`, `ba`, `stat`, `steps`, `ask`, `todo`, `fig`/`credit`.
  Deck-specific components go in `styles/index.css`.
- Canvas is 980 × 551, 16:9. Nothing may overflow. Verify by PNG export.
- Every slide carries speaker notes (`<!-- -->`) with a spoken script and the
  sources for its numbers. The two prior ODSI decks do this, and the presenter
  relies on it.
- Diagrams are drawn in the deck palette as inline SVG or HTML/CSS. The
  Excalidraw AWS diagrams in `hls-nextgen-orchestration/docs/` are too dense
  for this room and are not used.
- Text convention (my call, carried over from the LaSRC deck, where it was
  "by request"): no em dashes in slide text.
- Images reused from the LaSRC deck (validation plots) are copied into
  `public/images/`.

## Sources

| Short name | Location |
|---|---|
| Outline | `Outline.md` (this repo) |
| LaSRC deck | https://github.com/developmentseed/lasrc_rust_presentation (`index.html`, `outline.md`, `images/`) |
| Design doc | NASA-IMPACT/hls-nextgen-orchestration PR #7, `docs/orchestration-design.md` |
| Cost analysis | NASA-IMPACT/hls-nextgen-orchestration `docs/cost-analysis.md` |
| 2025 bill | `HLS_MCP_costs_breakdown_2025.csv` (this repo): monthly AWS costs by service, Jan–Dec 2025 |
| SNWG research | `docs/research/snwg-solutions.md` (this repo): patterns, evidence, confidence and URLs |

## Key numbers (use exactly these)

**2025 bill.** Per-service lines in the CSV are before credits. Only the
total is net of the $34,940 credit line, and the credits ended after June.

- Gross: $452,535.
- Net: $417,593.
- Shares, always computed against gross:
  - EC2 instances $240,404 (53%)
  - S3 $153,913 (34%)
  - Everything else about $58k (13%), including Config $20,696, Step
    Functions $12,408, RDS $8,266 and Lambda $290.
- On slides, say "about $450k in 2025 (about $418k after credits)".
- Monthly net total: peaked at $43.7k in July and fell to $23.0k in
  December.

**Orchestration, from the cost analysis.**

| Item | Current | New |
|---|---|---|
| Step Functions | $15,518 | not used |
| RDS | $4,375 | not used |
| Lambda | $205 | ~$2 |
| S3 ancillary polling | ~$60 | ~$0 |
| S3 event store | not used | ~$180 |
| SQS + EventBridge | not used | ~$15 |
| **Total** | **~$20,160/yr** | **~$200/yr** |

- Step Functions: about 113 billed transitions per granule against about 12
  real lifecycle transitions.
- The 2025 bill corroborates these figures: Step Functions $12.4k and RDS
  $8.3k (RDS was about $2.1–2.4k/month until February, then about $310–390).
- Full reprocessing of about 30M granules (HLS v3), orchestration only:
  $55,000–85,000 on Step Functions against about $4,100 on the new system.
  The cost analysis gives $2,700 in one table and $4,100 in another (open
  question 2).
- Volume: about 15,000 granules/day (Landsat about 5,500–6,000, Sentinel-2
  about 8,500–9,000).

**Reliability (design doc).**
- RDS timeouts silently drop granules and leave outcomes unrecorded.
- Pruning the database destroys the audit trail.
- Step Functions polling hits AWS rate limits at 10–20k concurrent jobs.
- Monolithic jobs: LaSRC is about 50% of Sentinel-2 runtime, so a Spot
  interruption late in a job wastes the most expensive compute.
- Twin granules are 8–10% of Sentinel-2 jobs, not the estimated <1%.
- The fmask split (Phase 2) lets cloudy or low-sun granules (10–15% of
  Sentinel-2) exit before LaSRC on a small instance.
- Proof: HLS-VI historical processed about 30M granules on the same pattern.
- Rollout: Phase 0 runs the new monitor in shadow mode, Phase 1 is
  event-driven, Phase 2 splits jobs, Phase 3 is historical reconciliation.

**LaSRC Rust.**
- The original estimate was 5–6 months of 1 FTE, compressed with
  multi-agent Claude Code sessions (open question 3: days or weeks).
- 353 reference granules × 7 bands, 100% within the 5 DN threshold
  (0.0005 reflectance).
- 30% faster, 7% less memory. These came from targeted tweaks only, so more
  is available.
- Bugs surfaced by the suite: type conversion, invalid auxiliary retrieval,
  scene-center geometry, scene-center interpolation.
- Next steps: GDAS auxiliary data for low latency, structural refactor,
  performance work, joint science review, then production.

**Rust compute-savings estimate (from the 2025 bill).**

Base: 2025 EC2 instances spend of $240,404 (CSV, before credits).

Assumptions:
- EC2 cost scales with job runtime. Batch jobs run on Spot and are billed per
  second.
- LaSRC is about 50% of job runtime. The design doc states this for
  Sentinel-2.
- "30% faster" means 30% less LaSRC runtime.

| Scenario | EC2 reduction | Annual saving |
|---|---|---|
| LaSRC about 50% of runtime for both sensors | 15.0% | **about $36k** |
| Sentinel-2 only (about 58% of granules), Landsat unchanged | 8.8% | **about $21k** |

- On the slide: **"about $21–36k a year in EC2"**, with "based on 2025 EC2
  spend of $240k" as the caption.
- The table and assumptions go in the speaker notes.
- If "30% faster" means 1.3× throughput (23% less time), the range is about
  $16–28k. The notes say which interpretation was used.
- This counts only the targeted tweaks made so far. Further performance work
  is upside.

## Slide-by-slide (approved flow, about 23 slides, about 22 min)

Times are targets. ★ marks a slide with an AI credit.

### 1. Open and goals (about 3.5 min)

1. **Title** (`odsi-title`). Kicker: "SNWG · HLS". Title: "Finding
   Efficiencies in HLS Production". Subtitle along the lines of: what six
   years of operating HLS taught us about cost, and what other solutions can
   take from it. Foot: Sean Harkins · Development Seed.
2. **HLS at a glance.**
   - Stats: running continuously since 2020; about 15k granules/day; Landsat
     plus Sentinel-2 harmonized at 30 m; distributed by LP DAAC; about $450k AWS in
     2025 (about $418k after credits).
   - Small note on the solutions that build on HLS. This foreshadows slide 22.
3. **Why now.**
   - Lessons learned operating at scale. Architectural approaches changed
     over the period.
   - The low-latency requirement is the opportunity to re-architect rather
     than patch.
4. **Our goals.** Five cards, with low latency as the trigger and the other
   four as the targets:
   - support low latency
   - reduce science-code risk
   - infrastructure cost to its theoretical floor
   - remove reprocessing bottlenecks
   - observability and reporting

   Optionally, a band showing where the 2025 money goes (EC2 53%, S3 34%,
   everything else 13%, gross), to show where each workstream bites.

### 2. Modernizing LaSRC (about 5.5 min), condensed from the LaSRC deck

5. **Section opener.**
6. **Science code ≠ production code.**
   - `ba` panels in the LaSRC deck's framing.
   - Compact risk list: one maintainer, deprecated build chain, no public
     repo or releases, separate VIIRS and MODIS auxiliary paths, HLS code
     coupled to LaSRC internals.
7. **Why now: the 5–6 month problem.**
   - GDAS auxiliary data for low latency would have meant deep surgery on
     ESPA.
   - Porting became the cheaper route to a requirement we had to meet anyway.
8. **★ The loop.**
   - Inline SVG of the agent porting loop: agents port → run on a reference
     granule → diff against C → accept, or refactor and rerun.
   - AI credit: several Claude Code sessions in parallel.
   - Punchline band: "the critical ingredient was the reference output, not
     the model".
9. **★ Validation and humans in the loop.**
   - The in-house suite (credit Trang Vo and Madhu Sridhar): 353 granules,
     7 bands.
   - The full run surfaced the four bug classes.
   - Chris Holden worked through them in an agent-plus-review loop. AI sped
     this up but is "only as capable as the engineer or scientist using it".
10. **Results.**
    - Stats: 100% within 5 DN · 30% faster · 7% less memory · about
      $21–36k/yr EC2 estimate.
    - One validation figure from the LaSRC deck
      (`distribution_summary_immediate_20260922_150055.png`).
    - Note that further performance work has not started yet.

### 3. Next-generation infrastructure (about 7 min)

11. **Section opener.**
12. **What hurts today.**
    - Simple diagram of the current flow: Step Functions polling loop → Batch
      monolithic job → RDS log.
    - Four pain cards: granules silently dropped, polling cost and rate
      limits, Spot risk on long jobs, history pruned away.
13. **★ The new design.**
    - Simple event-driven diagram: S3 arrival → Lambda → Batch (Spot) →
      EventBridge → job monitor → S3 log, with retry queue and dead-letter
      queue.
    - Principle: "S3 is the event store, log and coordination mechanism".
    - One line crediting Claude as the coding assistant on the prototype.
14. **Annual cost table.** The orchestration table above, with the
    ~$20,160 → ~$200 total called out.
15. **Where the money went.**
    - Bar or visual: about 113 billed transitions per granule against about
      12 real ones.
    - "We were paying to ask 'are you done yet?'"
16. **Reprocessing projection.**
    - 30M granules: $55–85k → about $4.1k orchestration.
    - No rate-limit ceiling.
    - Spot-friendly split jobs (Phase 2): fmask exits early for 10–15% of
      Sentinel-2.
17. **Questions we can now answer.**
    - Reconciliation with LP DAAC (outputs) and CMR (inputs).
    - Failure rates by mode, cloud and low-sun rates.
    - Retained indefinitely at about $180/yr.
18. **Proven, then phased.**
    - HLS-VI: about 30M granules on this pattern.
    - Phases 0–3, starting with a zero-risk shadow monitor.

### 4. Applying this to other SNWG solutions (about 6 min)

19. **Section opener.**
20. **Patterns we see across solutions** (unnamed). Six pattern → HLS lesson
    pairs:
    1. Whole granules copied to local disk, sometimes more than once → read
       only the bytes you need, from cloud-optimized sources.
    2. Long single-step jobs pushed onto on-demand instances → split jobs so
       Spot is safe.
    3. Always-on control servers and databases, sometimes two orchestrators →
       event-driven, scale to zero.
    4. Legacy Fortran or C wrapped in Python layers → port with agents plus a
       validation suite.
    5. Homemade accountability scripts → an append-only event log you can
       query.
    6. Reprocessing campaigns with no cost estimate up front → model the cost
       before you run the campaign.
21. **Questions to ask about your own system.**
    - A short self-assessment checklist (about 5–6 items), each tied to a
      lesson above.
    - For example: "Do you know your cost per granule?" and "Are you paying
      for anything while nothing is arriving?"
22. **HLS gains carry downstream.**
    - Named consumers of HLS: OPERA DSWx-HLS and DIST-HLS, FIRMS-2G burned
      area (via HLS-VI), HLS-LST.
    - Lower latency and cost at HLS help them.
    - Solutions still in design (e.g. MWOW, GABAN, PBL) can adopt these
      patterns from the start.
23. **★ Takeaways and the offer** (`odsi-dark`, `ask` rows):
    1. Measure first: know your cost per granule.
    2. Pay only for events, not for waiting.
    3. Legacy science code is now affordable to modernize, *if* you have a
       validation suite.
    4. Talk to us: we can share designs, cost models and validation tooling.
       Include contact details.

## Build decisions

- **The deck replaces the sample `slides.md`.** The sample stays in git
  history.
- **Speaker notes follow the same no-attribution rule as slides.** The built
  deck exposes notes in presenter mode, so notes cite "see
  `docs/research/snwg-solutions.md`" rather than naming solutions next to
  patterns.
- **Unanswered open questions ship as `todo` boxes or marked placeholders.**
  After they're filled, there is a second PNG overflow check.

## Calls I made (presenter to check)

- Time split: about 16 min HLS and about 6 min SNWG.
- The AI credit sits on slides 8, 9, 13 and 23 only.
- Orchestration figures come from the cost analysis, with the 2025 bill as
  corroboration in the notes, because the bill's Step Functions figure
  ($12.4k) is for a different period than the analysis ($15.5k).
- The Rust savings are shown as a range ($21–36k/yr), with the assumptions
  stated.
- **The GitHub Pages deploy workflow is disabled.** It is renamed to manual
  trigger only (`workflow_dispatch`), so nothing publishes until the
  presenter decides.
- No em dashes.
- The Config ($20.7k) and S3 ($154k) lines are not addressed on slides unless
  the presenter wants them (open question 4).

## Open questions

1. The LaSRC share of Landsat job runtime, so the $21–36k/yr range can be
   narrowed.
2. Whether the reprocessing figure is $4,100 or $2,700.
3. Whether the port took "days" or "weeks".
4. What caused the drop in monthly spend from about $43k (July) to about $23k
   (December). If it was this team's work, it is a strong slide. If it was
   seasonal (fewer granules in the northern winter), it should not be
   claimed.
5. Contact details and the offer on slide 23.

## Left to the builder

- Exact slide wording, diagram drawing, and the speaker-note scripts, within
  the content above.
- Component styling in `styles/index.css`.
- Whether slides 17 and 18 merge if time runs long.
