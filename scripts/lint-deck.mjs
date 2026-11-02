// Deck lint: checks slides.md against scripts/deck-rules.json.
// Usage: node scripts/lint-deck.mjs slides.md [--final]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@slidev/parser'

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

const bannedRe = new RegExp(`\\b(${rules.banned.join('|')})\\b`)

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

  // (e) no attribution of other solutions
  const noteHit = note.match(bannedRe)
  if (noteHit) fail(n, alias, 'banned-name', `"${noteHit[1]}" in speaker note`)
  if (rules.noNames.includes(expected)) {
    const hit = slide.content.match(bannedRe)
    if (hit) fail(n, alias, 'banned-name', `"${hit[1]}" in slide content`)
  }

  // (f) pinned figures
  for (const pin of rules.pins[expected] ?? []) {
    if (!slide.content.includes(pin) && !note.includes(pin))
      fail(n, alias, 'pin', `missing "${pin}"`)
  }
})

// (g) publishing must be manual
const workflow = path.join(root, '.github/workflows/deploy.yml')
if (fs.existsSync(workflow) && /^\s*push:/m.test(fs.readFileSync(workflow, 'utf8')))
  fail('-', 'deck', 'publish', '.github/workflows/deploy.yml triggers on push')

if (failures.length) {
  console.log(failures.join('\n'))
  console.log(`\n${failures.length} problem(s)`)
  process.exit(1)
}
console.log(`lint ok: ${slides.length} slides`)
