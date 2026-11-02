# HLS Efficiencies Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sample `slides.md` with the approved 23-slide "Finding
Efficiencies in HLS Production" deck in the ODSI Slidev template. Every slide
fits the canvas, every number matches the spec, and every slide has sourced
speaker notes.

**Architecture:**
- One Slidev deck, `slides.md`, built on the existing `odsi*` layouts and
  `styles/odsi.css`.
- New deck-only components go in `styles/index.css`.
- Two automated checks act as the test suite:
  - `scripts/lint-deck.mjs` parses the deck with `@slidev/parser`. It checks
    slide count, notes, banned characters, no-attribution rules and pinned
    numbers per slide.
  - `scripts/check-overflow.mjs` drives Playwright against the dev server
    and flags any element outside the slide frame.
- Visual review is by PNG export.

**Tech Stack:** Slidev 0.50, Vue SFC layouts, UnoCSS utilities, plain CSS,
Node ESM scripts, playwright-chromium (already a dev dependency).

**Spec:** `docs/superpowers/specs/2026-11-02-hls-efficiencies-deck-design.md`.
Read it in full first. Slide content, wording intent and numbers come from
its "Key numbers" and "Slide-by-slide" sections. Research for slides 20–22
is in `docs/research/snwg-solutions.md`.

## Global Constraints

- Layouts: `odsi-title` (slide 1), `odsi-section` (openers 5, 11, 19),
  `odsi-dark` (slide 23), and `odsi` for everything else.
- Headings: `# H1` is the kicker and `## H2` is the heading on every slide.
- Canvas is 980 × 551. Nothing may overflow. `check-overflow.mjs` must report
  0 problems.
- No em dash (U+2014) anywhere in `slides.md`, including notes.
- Every slide has a speaker note (`<!-- -->`) of at least 40 words: a spoken
  script plus a `Sources:` line.
- Slides 20 and 21, and every speaker note, must not name another SNWG
  solution or system. Banned list: OPERA, NISAR, TEMPO, ICESat, GEOS,
  HySDS, LANCE, FIRMS, MWOW, GABAN, PBL, SatCORPS. Slide 22 is the only
  exception, and only in its visible text.
- Notes cite SNWG evidence as `docs/research/snwg-solutions.md`, never by
  project name.
- Cost figures, exactly as written in the spec:
  - 2025 bill: "about $450k in 2025 (about $418k after credits)"
  - EC2 $240k
  - Rust "about $21–36k a year in EC2"
  - Orchestration "~$20,160" → "~$200" per year
  - Transitions per granule: 113 against 12
  - Reprocessing "$55–85k" → "~$4.1k"
- AI credit appears only on slides 8, 9, 13 and 23. Slide 13 says only that
  Claude was used as a coding assistant.
- Unanswered open questions (spec §Open questions 2–5) appear as `.todo`
  boxes. The July–December spend drop is not claimed anywhere on a slide.
- Diagrams are inline SVG or HTML/CSS in the deck palette. Do not use the
  Excalidraw PNGs.
- Each slide's frontmatter carries `routeAlias: <id>` using the IDs in
  Task 1. The lint keys on these.

## Review Focus

1. **Real numbers grow the text.** Filling a `todo` (contact details, days or
   weeks) adds text, and that can overflow a slide that passed before. Rerun
   the overflow check after any text edit, not only at the end of a task.
2. **Speaker notes are public.** Presenter mode shows notes in any build, so
   a project name in a note breaks the anti-goal even though the slide looks
   clean. The lint scans notes as well as content.
3. **Figures drift between slides.** The same figure appears on several
   slides: $240k on slides 4, 10 and 14 notes; ~$20,160 on slides 14 and 15.
   The lint pins each figure per slide, so a slide edited in isolation can't
   silently disagree with another.
4. **Diagram text is unreadable when projected.** SVG labels that look fine
   in a browser can be tiny on a projector. The overflow check also flags SVG
   `<text>` rendered under 11 px at canvas scale.
5. **The publish workflow fires on push.** `.github/workflows/deploy.yml`
   must not trigger on push to `main`. Task 1 changes it and the lint checks
   the file.

---

### Task 1: Tooling, deck skeleton, publish guard

**Files:**
- Create: `scripts/lint-deck.mjs`, `scripts/check-overflow.mjs`,
  `scripts/deck-rules.json`
- Modify: `.github/workflows/deploy.yml` (trigger),
  `package.json` (scripts), `slides.md` (replace the sample with the
  skeleton)
- Create: `public/images/` with two files copied from
  `developmentseed/lasrc_rust_presentation/images/`:
  `distribution_summary_immediate_20260922_150055.png` and
  `scatter_summary_immediate_20260922_150055.png`

**Interfaces:**
- Produces:
  - **Commands:** `npm run lint` runs
    `node scripts/lint-deck.mjs slides.md` and exits non-zero on any
    violation. `npm run overflow` runs
    `node scripts/check-overflow.mjs --url http://localhost:3031` and exits
    non-zero on any problem.
  - **`scripts/deck-rules.json`:**
    `{ "slideCount": 23, "banned": [...], "noNames": [aliases], "pins": { "<alias>": ["exact substring", ...] } }`
  - **Slide aliases, in order:**
    1. `title`
    2. `glance`
    3. `why-now`
    4. `goals`
    5. `lasrc`
    6. `science-vs-prod`
    7. `five-months`
    8. `loop`
    9. `validation`
    10. `lasrc-results`
    11. `infra`
    12. `hurts`
    13. `new-design`
    14. `cost-table`
    15. `polling`
    16. `reprocessing`
    17. `answers`
    18. `phased`
    19. `snwg`
    20. `patterns`
    21. `self-check`
    22. `downstream`
    23. `takeaways`
- **Pins** (exact substrings that must appear in that slide's content or
  note):
  - `glance`: "2020", "15,000"
  - `goals`: "$240k"
  - `lasrc-results`: "353", "5 DN", "30%", "7%", "$21–36k"
  - `cost-table`: "$15,518", "$4,375", "$20,160", "$200"
  - `polling`: "113", "12"
  - `reprocessing`: "30M", "$55–85k", "$4.1k"
  - `phased`: "30M"
  - `five-months`: "5–6 months"

- [ ] **Step 1: Write `scripts/deck-rules.json`**

  Use the aliases and pins above. `banned` is the list from Global
  Constraints. `noNames` is `["patterns", "self-check"]`.

- [ ] **Step 2: Write `scripts/lint-deck.mjs`**

  It uses `parse` from `@slidev/parser` and checks the following, printing one
  line per failure as `slide <n> (<alias>): <rule>: <detail>`:
  - (a) The slide count equals `slideCount`, but only when run with
    `--final`. Without it, the count must not exceed `slideCount`.
  - (b) Each slide's `frontmatter.routeAlias` matches the alias at that index.
  - (c) The note has at least 40 words and contains `Sources:`.
  - (d) There is no U+2014 anywhere in the raw file.
  - (e) No banned word appears in any note, or in the content of a `noNames`
    slide. Use a case-sensitive whole-word match.
  - (f) Every pin for a present alias appears in that slide's content or
    note.
  - (g) `.github/workflows/deploy.yml` contains no `push:` trigger.

- [ ] **Step 3: Run the lint against the current sample deck to check it
  fails**

  Run: `npm run lint`

  Expected: FAIL. The output reports a `routeAlias` failure on slide 1 and
  the `deploy.yml` push trigger.

- [ ] **Step 4: Change the trigger in `deploy.yml`**

  Replace the `on:` block with `workflow_dispatch:` only. Add a comment that
  publishing is manual until the presenter decides.

- [ ] **Step 5: Replace `slides.md` with the skeleton**

  - Keep the existing headmatter, but set `title` to "Finding Efficiencies in
    HLS Production", `layout: odsi-title` and `routeAlias: title`.
  - Write all 23 slides with their layout and `routeAlias`, each holding only
    its `# kicker` / `## heading` from the spec and a placeholder note.
  - Copy the two images into `public/images/`.

- [ ] **Step 6: Write `scripts/check-overflow.mjs`**

  Use `chromium` from `playwright-chromium`. For each slide `n` from 1 to
  the slide count, it loads `${url}/${n}` and waits for `.slidev-layout`.
  It then reports any element inside `.slidev-layout` whose
  `getBoundingClientRect()` extends more than 2 px beyond the layout's rect,
  and any SVG `text` whose `getBoundingClientRect().height`, divided by
  the slide scale (`layoutRect.width / 980`), is under 11 px. Print `slide <n>: <selector> <reason>` and exit 1
  if anything is found.

  Run the dev server first with `npx slidev slides.md --port 3031` in the
  background.

- [ ] **Step 7: Run both checks**

  Run: `npm run lint && npm run overflow`

  Expected: the lint passes except pins (pins for slides with placeholder
  notes will fail). That is expected until Tasks 2–5 fill them. The overflow
  check reports 0 problems.

  Record the remaining pin failures. Each later task must clear its own.

- [ ] **Step 8: Commit**

  ```bash
  git add scripts package.json .github/workflows/deploy.yml slides.md public/images
  git commit -m "feat: deck skeleton, lint and overflow checks, manual-only publish"
  ```

---

### Task 2: Act 1, open and goals (slides 1–4)

**Files:** Modify `slides.md` (slides 1–4) and `styles/index.css`.

**Interfaces:**
- Consumes the Task 1 aliases and checks.
- Produces `.statrow`, `.statrow .cell`, `.statrow .n` and `.statrow .k`
  in `styles/index.css`: a 3–5-up row of big numbers on white cards, sized
  from `.stat`. Slide 10 reuses it.

- [ ] **Step 1: Write slides 1–4**

  Write the content per spec §"1. Open and goals". Then:
  - **Slide 2:** use `.statrow` for "since 2020 / 15,000 granules a day /
    about $450k in 2025".
  - **Slide 4:** five `.grid` cards (use `g3` + `g2` rows, or a 5-column
    grid if it fits). Add the optional spend band: EC2 53%, S3 34%, other
    13%, built as a single horizontal stacked bar in HTML.
  - **Notes:** write a spoken script plus `Sources:` for each slide (spec
    table names). Slide 4's note includes "$240k".

- [ ] **Step 2: Run the checks for slides 1–4**

  Run: `npm run lint && npm run overflow`

  Expected: no failures for `title`, `glance`, `why-now` or `goals`; the
  overflow check reports 0 problems.

- [ ] **Step 3: Visual review**

  Run:
  `npx slidev export slides.md --format png --range 1-4 --output .slidev/review/a1`

  Then read each PNG. Fix any crowding, contrast, or orphaned single words
  in the headings.

- [ ] **Step 4: Commit**

  `git commit -am "feat: act 1 slides"`

---

### Task 3: Act 2, LaSRC (slides 5–10)

**Files:** Modify `slides.md` (slides 5–10) and `styles/index.css`.

**Interfaces:**
- Consumes `.statrow` (Task 2).
- Produces `svg.loop`: the porting-loop diagram style (box, arrow and label
  classes scoped to `.loop`).

- [ ] **Step 1: Write slides 5–10**

  Write the content per spec §"2. Modernizing LaSRC", condensing the LaSRC
  deck (its text is the source and can be adapted). Then:
  - **Slide 6:** `ba` panels plus a compact risk list.
  - **Slide 8:** an inline SVG loop: Agents port C → Run on reference
    granule → Diff against ESPA C → decision "within 5 DN?", with yes going
    to Accept and no going to "adjust, refactor, rerun" back to the start.
    Add the band "The critical ingredient was the reference output, not the
    model."
  - **Slide 9:** two cards, "What the suite found" (the four bug classes) and
    "Humans in the loop", crediting Trang Vo, Madhu Sridhar and Chris Holden.
  - **Slide 7:** a `.todo` box asks "days or weeks?" (spec open question 3).
  - **Slide 10:** `.statrow` with "100% within 5 DN / 30% faster / 7% less
    memory / about $21–36k a year in EC2". Add
    `distribution_summary_immediate_20260922_150055.png` as a `.fig` with a
    `.credit`. Put the two-scenario savings table and the assumptions from
    the spec into the note.

- [ ] **Step 2: Run the checks for slides 5–10**

  Run: `npm run lint && npm run overflow`

  Expected: no failures for slides 5–10; the overflow check reports 0
  problems.

- [ ] **Step 3: Visual review**

  Export with `--range 5-10 --output .slidev/review/a2` and read each PNG.

- [ ] **Step 4: Commit**

  `git commit -am "feat: act 2 LaSRC slides"`

---

### Task 4: Act 3, next-gen infrastructure (slides 11–18)

**Files:** Modify `slides.md` (slides 11–18) and `styles/index.css`.

**Interfaces:**
- Produces two styles in `styles/index.css`:
  - `.flowdgm`: an HTML/CSS row-of-boxes flow, used by slides 12 and 13.
  - `.hbar`: a labelled horizontal bar with width set by `--w`, used by
    slides 15 and 16.

- [ ] **Step 1: Write slides 11–18**

  Write the content per spec §"3. Next-generation infrastructure". Then:
  - **Slide 12:** a `.flowdgm` of the current system: Step Functions
    (polling loop) → Batch monolithic job → RDS log. Below it, four coral
    pain cards.
  - **Slide 13:** a `.flowdgm` of the new system: S3 arrival → Lambda →
    Batch (Spot) → EventBridge → job monitor → S3 log, with a retry queue
    and a dead-letter queue branch.
  - **Slide 14:** a markdown table using the spec's orchestration table
    verbatim, with the total row bold.
  - **Slide 15:** `.hbar` 113 against 12.
  - **Slide 16:** `.hbar` $85k / $55k / $4.1k. Add a `.todo` noting $4.1k
    against $2.7k (spec open question 2).
  - **Slide 18:** `steps` for Phases 0–3.
  - **Slide 13's note:** says Claude was used as a coding assistant, and
    nothing more.

- [ ] **Step 2: Run the checks for slides 11–18**

  Run: `npm run lint && npm run overflow`

  Expected: no failures for slides 11–18; the overflow check reports 0
  problems.

- [ ] **Step 3: Visual review**

  Export with `--range 11-18 --output .slidev/review/a3` and read each PNG. The
  diagrams must be readable at a glance by a non-technical manager.

- [ ] **Step 4: Commit**

  `git commit -am "feat: act 3 infrastructure slides"`

---

### Task 5: Act 4, other SNWG solutions (slides 19–23)

**Files:** Modify `slides.md` (slides 19–23).

- [ ] **Step 1: Write slides 19–23**

  Write the content per spec §"4. Applying this to other SNWG solutions". Use
  `docs/research/snwg-solutions.md` for evidence, cited by file name only in
  the notes. Then:
  - **Slide 20:** six pattern → lesson pairs.
  - **Slide 21:** a checklist of 5–6 questions.
  - **Slide 22:** names only the HLS consumers and the early-stage
    solutions, framed positively.
  - **Slide 23:** `odsi-dark` with four `.ask` rows. The fourth row contains
    a `.todo` for the offer and contact details (spec open question 5).

- [ ] **Step 2: Run the checks for slides 19–23**

  Run: `npm run lint && npm run overflow`

  Expected: no failures for slides 19–23; the overflow check reports 0
  problems.

- [ ] **Step 3: Visual review**

  Export with `--range 19-23 --output .slidev/review/a4` and read each PNG.

- [ ] **Step 4: Commit**

  `git commit -am "feat: act 4 SNWG slides"`

---

### Task 6: Whole-deck pass and README

**Files:** Modify `README.md` and `slides.md` (fixes only). Create
`slides.pdf`.

- [ ] **Step 1: Run the final checks**

  Run: `node scripts/lint-deck.mjs slides.md --final && npm run overflow`

  Expected: PASS, with a 23-slide count and 0 overflow problems.

- [ ] **Step 2: Timing check**

  Count the words in the notes. At about 140 words a minute, the total
  should be 2,800–3,500 words (20–25 min). Trim or extend the notes to fit.

- [ ] **Step 3: Full visual review**

  Export all 23 slides to PNG and read them in order, checking for a
  consistent visual rhythm and the same figure appearing identically
  everywhere.

- [ ] **Step 4: Export the PDF**

  Run: `npx slidev export slides.md --output slides.pdf`

  Expected: the file exists and has 23 pages.

- [ ] **Step 5: Rewrite `README.md`**

  Cover:
  - what the deck argues
  - the slide table by act
  - how to run, export and check (`npm run lint`, `npm run overflow`)
  - sources
  - a "Before presenting" list of the `.todo` boxes
  - the note that publishing is manual

- [ ] **Step 6: Commit**

  `git add -A && git commit -m "docs: README, PDF export, final pass"`
