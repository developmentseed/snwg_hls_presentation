// Pure checks used by lint-deck.mjs, kept separate so they can be tested.
import { parse as parseYaml } from 'yaml'

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A workflow may only run when started by hand. Returns one line per problem.
export function publishProblems(yamlText) {
  const doc = parseYaml(yamlText) ?? {}
  // YAML 1.1 readers may turn the `on` key into `true`
  let on = doc.on ?? doc[true]
  if (typeof on === 'string') on = [on]
  const triggers = Array.isArray(on) ? on : Object.keys(on ?? {})
  return triggers.filter(t => t !== 'workflow_dispatch').map(t => `triggers on ${t}`)
}

// First banned name in text, as written, or null. Case-insensitive, whole word
// (so "opera-sds-pcm" matches OPERA but "operations" does not).
export function bannedHit(text, names) {
  const m = text.match(new RegExp(`\\b(${names.map(escape).join('|')})\\b`, 'i'))
  return m ? m[1] : null
}

// First forbidden phrase found in text, or null. Case-insensitive.
export function forbiddenHit(text, phrases) {
  const lower = text.toLowerCase()
  return phrases.find(p => lower.includes(p.toLowerCase())) ?? null
}
