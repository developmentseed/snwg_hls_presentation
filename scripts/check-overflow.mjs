// Overflow check: loads every slide from a running Slidev dev server and
// reports elements outside the slide frame and SVG text too small to read.
// Usage: npx slidev slides.md --port 3031 &   then
//        node scripts/check-overflow.mjs --url http://localhost:3031
import fs from 'node:fs'
import { chromium } from 'playwright-chromium'
import { parse } from '@slidev/parser'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : fallback
}
const url = arg('--url', 'http://localhost:3031')
const file = arg('--file', 'slides.md')
const CANVAS_WIDTH = 980
const MIN_TEXT_PX = 11
const TOLERANCE = 2

const { slides } = await parse(fs.readFileSync(file, 'utf8'), file)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const problems = []

for (let n = 1; n <= slides.length; n++) {
  await page.goto(`${url}/${n}`, { waitUntil: 'networkidle' })
  // Slidev keeps neighbouring slides mounted but hidden; wait for a visible one
  await page.waitForFunction(() =>
    [...document.querySelectorAll('#slide-content .slidev-layout')].some(l => l.checkVisibility()))
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400) // let the fade transition finish

  const found = await page.evaluate(({ canvasWidth, minText, tol }) => {
    const layout = [...document.querySelectorAll('#slide-content .slidev-layout')]
      .find(l => l.checkVisibility())
    const frame = layout.getBoundingClientRect()
    const scale = frame.width / canvasWidth
    const describe = el =>
      el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : '') +
      (el.textContent ? ` "${el.textContent.trim().slice(0, 30)}"` : '')
    const out = []
    for (const el of layout.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') {
        if (el.tagName.toLowerCase() === 'text' && r.height / scale < minText)
          out.push(`${describe(el)} svg text ${(r.height / scale).toFixed(1)}px < ${minText}px`)
        continue
      }
      // content cut off inside a box that hides its overflow
      const style = getComputedStyle(el)
      if ((style.overflow + style.overflowX + style.overflowY).includes('hidden') &&
          (el.scrollWidth > el.clientWidth + tol || el.scrollHeight > el.clientHeight + tol))
        out.push(`${describe(el)} clips its content`)
      const over = [
        frame.left - r.left, r.right - frame.right,
        frame.top - r.top, r.bottom - frame.bottom,
      ].map(d => d / scale)
      if (Math.max(...over) > tol)
        out.push(`${describe(el)} outside frame by ${Math.max(...over).toFixed(0)}px`)
    }
    return out
  }, { canvasWidth: CANVAS_WIDTH, minText: MIN_TEXT_PX, tol: TOLERANCE })

  for (const p of found) problems.push(`slide ${n}: ${p}`)
}

await browser.close()
if (problems.length) {
  console.log(problems.join('\n'))
  console.log(`\n${problems.length} problem(s)`)
  process.exit(1)
}
console.log(`overflow ok: ${slides.length} slides`)
