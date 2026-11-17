// Builds src/data/glyphs.json and src/data/kanji.json from open data:
//   - KanjiVG (stroke order paths)  © Ulrich Apel, CC BY-SA 3.0  https://kanjivg.tagaini.net
//   - KANJIDIC2 (kanji meanings/readings) © EDRDG, CC BY-SA 4.0   https://www.edrdg.org/wiki/index.php/KANJIDIC_Project
// Downloads are cached in scripts/.cache so re-runs are offline.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cache = join(here, '.cache')
const out = join(here, '..', 'src', 'data')
const KVG = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/'
const KANJIDIC = 'http://www.edrdg.org/kanjidic/kanjidic2.xml.gz'
const BOX = 109 // KanjiVG view box
const SCALE = 1000 // stored coordinates are integers in 0..1000

const exists = (p) => access(p).then(() => true, () => false)

async function cached(name, url, binary = false) {
  const file = join(cache, name)
  if (await exists(file)) return readFile(file, binary ? undefined : 'utf8')
  const res = await fetch(url)
  if (res.status === 404) {
    await writeFile(file, '')
    return binary ? Buffer.alloc(0) : ''
  }
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(file, buf)
  return binary ? buf : buf.toString('utf8')
}

// ---- SVG path -> polyline -------------------------------------------------

function parsePath(d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtZz]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g) ?? []
  const pts = []
  let i = 0
  let cmd = ''
  let x = 0, y = 0, sx = 0, sy = 0
  let pcx = null, pcy = null // previous control point (for S/T)
  const num = () => Number(tokens[i++])
  const cubic = (x1, y1, x2, y2, x3, y3) => {
    const x0 = x, y0 = y
    for (let s = 1; s <= 12; s++) {
      const t = s / 12, u = 1 - t
      pts.push([
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ])
    }
    x = x3; y = y3
  }
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++]
    const rel = cmd === cmd.toLowerCase()
    const ox = rel ? x : 0, oy = rel ? y : 0
    switch (cmd.toUpperCase()) {
      case 'M':
        x = ox + num(); y = oy + num(); sx = x; sy = y
        pts.push([x, y]); pcx = pcy = null
        cmd = rel ? 'l' : 'L'
        break
      case 'L': x = ox + num(); y = oy + num(); pts.push([x, y]); pcx = pcy = null; break
      case 'H': x = ox + num(); pts.push([x, y]); pcx = pcy = null; break
      case 'V': y = oy + num(); pts.push([x, y]); pcx = pcy = null; break
      case 'C': {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), x3 = ox + num(), y3 = oy + num()
        cubic(x1, y1, x2, y2, x3, y3); pcx = x2; pcy = y2
        break
      }
      case 'S': {
        const x1 = pcx === null ? x : 2 * x - pcx, y1 = pcy === null ? y : 2 * y - pcy
        const x2 = ox + num(), y2 = oy + num(), x3 = ox + num(), y3 = oy + num()
        cubic(x1, y1, x2, y2, x3, y3); pcx = x2; pcy = y2
        break
      }
      case 'Q': {
        const qx = ox + num(), qy = oy + num(), x3 = ox + num(), y3 = oy + num()
        cubic(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x3 + (2 / 3) * (qx - x3), y3 + (2 / 3) * (qy - y3), x3, y3)
        pcx = qx; pcy = qy
        break
      }
      case 'T': {
        const qx = pcx === null ? x : 2 * x - pcx, qy = pcy === null ? y : 2 * y - pcy
        const x3 = ox + num(), y3 = oy + num()
        cubic(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x3 + (2 / 3) * (qx - x3), y3 + (2 / 3) * (qy - y3), x3, y3)
        pcx = qx; pcy = qy
        break
      }
      case 'Z': x = sx; y = sy; pts.push([x, y]); pcx = pcy = null; break
      default: throw new Error(`Unsupported path command "${cmd}" in ${d}`)
    }
  }
  return pts
}

// Ramer–Douglas–Peucker simplification
function simplify(pts, eps) {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = pts[a], [bx, by] = pts[b]
    const dx = bx - ax, dy = by - ay
    const len = Math.hypot(dx, dy) || 1e-9
    let worst = 0, at = -1
    for (let k = a + 1; k < b; k++) {
      const dist = Math.abs(dy * (pts[k][0] - ax) - dx * (pts[k][1] - ay)) / len
      if (dist > worst) { worst = dist; at = k }
    }
    if (worst > eps && at > 0) { keep[at] = 1; stack.push([a, at], [at, b]) }
  }
  return pts.filter((_, k) => keep[k])
}

function strokesFromSvg(svg) {
  const found = []
  for (const m of svg.matchAll(/<path\b[^>]*>/g)) {
    const tag = m[0]
    const id = /\bid="kvg:[0-9a-f]+-s(\d+)"/.exec(tag)
    const d = /\sd="([^"]+)"/.exec(tag)
    if (id && d) found.push([Number(id[1]), d[1]])
  }
  found.sort((a, b) => a[0] - b[0])
  return found.map(([, d]) =>
    simplify(parsePath(d), 0.22).flatMap(([px, py]) => [Math.round((px / BOX) * SCALE), Math.round((py / BOX) * SCALE)]),
  )
}

// ---- KANJIDIC2 ------------------------------------------------------------

function parseKanjidic(xml) {
  const list = []
  for (const block of xml.split('<character>').slice(1)) {
    const jlpt = /<jlpt>(\d)<\/jlpt>/.exec(block)
    if (!jlpt || jlpt[1] !== '4') continue // old JLPT level 4 ≈ today's N5
    const pick = (re) => [...block.matchAll(re)].map((m) => m[1])
    list.push({
      text: /<literal>(.+?)<\/literal>/.exec(block)[1],
      grade: Number(/<grade>(\d+)<\/grade>/.exec(block)?.[1] ?? 9),
      strokes: Number(/<stroke_count>(\d+)<\/stroke_count>/.exec(block)[1]),
      freq: Number(/<freq>(\d+)<\/freq>/.exec(block)?.[1] ?? 9999),
      on: pick(/<reading r_type="ja_on">(.+?)<\/reading>/g),
      kun: pick(/<reading r_type="ja_kun">(.+?)<\/reading>/g).filter((r) => !r.startsWith('-') && !r.endsWith('-')),
      meanings: pick(/<meaning>(.+?)<\/meaning>/g),
    })
  }
  return list.sort((a, b) => a.grade - b.grade || a.strokes - b.strokes || a.freq - b.freq)
}

// ---- main -----------------------------------------------------------------

async function pool(items, size, fn) {
  let next = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) await fn(items[next++])
  }))
}

await mkdir(cache, { recursive: true })
await mkdir(out, { recursive: true })

const kanji = parseKanjidic(gunzipSync(await cached('kanjidic2.xml.gz', KANJIDIC, true)).toString('utf8'))

const chars = []
for (let cp = 0x3041; cp <= 0x3096; cp++) chars.push(String.fromCodePoint(cp)) // hiragana
for (let cp = 0x30a1; cp <= 0x30fc; cp++) chars.push(String.fromCodePoint(cp)) // katakana + ー
for (const k of kanji) chars.push(k.text)

const glyphs = {}
await pool(chars, 8, async (ch) => {
  const hex = ch.codePointAt(0).toString(16).padStart(5, '0')
  const svg = await cached(`${hex}.svg`, `${KVG}${hex}.svg`)
  const strokes = svg ? strokesFromSvg(svg) : []
  if (strokes.length) glyphs[ch] = strokes
})

const ordered = Object.fromEntries(chars.filter((c) => glyphs[c]).map((c) => [c, glyphs[c]]))
await writeFile(join(out, 'glyphs.json'), JSON.stringify(ordered))
await writeFile(join(out, 'kanji.json'), JSON.stringify(kanji.filter((k) => glyphs[k.text]).map(({ text, on, kun, meanings, strokes }) => ({ text, on, kun, meanings: meanings.slice(0, 4), strokes }))))

const points = Object.values(ordered).flat().reduce((n, s) => n + s.length / 2, 0)
console.log(`glyphs: ${Object.keys(ordered).length} (${points} points), kanji: ${kanji.length}`)
console.log('missing:', chars.filter((c) => !glyphs[c]).join(' ') || 'none')
