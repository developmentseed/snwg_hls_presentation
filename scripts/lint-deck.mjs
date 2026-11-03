// Deck lint: checks slides.md against scripts/deck-rules.json.
// Usage: node scripts/lint-deck.mjs slides.md [--final]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@slidev/parser'
import { publishProblems, bannedHit, forbiddenHit } from './deck-checks.mjs'

const file = process.argv[2] ?? 'slides.md'
const final = process.argv.includes('--final')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rules = JSON.parse(fs.readFileSync(path.join(root, 'scripts/deck-rules.json'), 'utf8'))
const raw = fs.readFileSync(file, 'utf8')
const { slides } = await parse(raw, file)

const failures = []
const fail = (n, alias, rule, detail) =>
  failures.push(`slide ${n} (${alias ?? '?'}): ${rule}: ${detail}`)

// (a) slide count
if (final ? slides.length !== rules.slideCount : slides.length > rules.slideCount)
  fail('-', 'deck', 'count', `${slides.length} slides, expected ${final ? '' : 'at most '}${rules.slideCount}`)

// (d) no em dash anywhere
raw.split('\n').forEach((line, i) => {
  if (line.includes('—')) fail('-', 'deck', 'em-dash', `line ${i + 1}`)
})

slides.forEach((slide, i) => {
  const n = i + 1
  const expected = rules.aliases[i]
  const alias = slide.frontmatter?.routeAlias

  // (b) alias in order
  if (alias !== expected) fail(n, alias, 'alias', `expected routeAlias "${expected}"`)

  // (c) note with a script and sources
  const note = slide.note ?? ''
  const words = note.split(/\s+/).filter(Boolean).length
  if (words < 40) fail(n, alias, 'note', `${words} words, need at least 40`)
  if (!note.includes('Sources:')) fail(n, alias, 'note', 'missing "Sources:" line')

  // (e) no attribution of other solutions: notes everywhere, content
  // everywhere except the slides allowed to name downstream users
  const noteHit = bannedHit(note, rules.banned)
  if (noteHit) fail(n, alias, 'banned-name', `"${noteHit}" in speaker note`)
  if (!rules.namesAllowed.includes(expected)) {
    const hit = bannedHit(slide.content, rules.banned)
    if (hit) fail(n, alias, 'banned-name', `"${hit}" in slide content`)
  }

  // phrases that misstate the evidence on this slide
  const said = forbiddenHit(`${slide.content}\n${note}`, rules.forbid[expected] ?? [])
  if (said) fail(n, alias, 'forbidden', `"${said}"`)

  // (f) pinned figures
  for (const pin of rules.pins[expected] ?? []) {
    if (!slide.content.includes(pin) && !note.includes(pin))
      fail(n, alias, 'pin', `missing "${pin}"`)
  }
})

// (g) publishing must be manual, in every workflow
const workflows = path.join(root, '.github/workflows')
for (const f of fs.existsSync(workflows) ? fs.readdirSync(workflows) : []) {
  if (!/\.ya?ml$/.test(f)) continue
  for (const p of publishProblems(fs.readFileSync(path.join(workflows, f), 'utf8')))
    fail('-', 'deck', 'publish', `.github/workflows/${f} ${p}`)
}

if (failures.length) {
  console.log(failures.join('\n'))
  console.log(`\n${failures.length} problem(s)`)
  process.exit(1)
}
console.log(`lint ok: ${slides.length} slides`)
