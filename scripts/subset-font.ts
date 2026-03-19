/**
 * 从仓库中的完整思源宋体 TTF 生成仅含简历用字的 WOFF2 子集，供页面使用。
 * 依赖：subset-font。
 * 完整字体为 public/fonts/SourceHanSerifSC-VF.ttf（需提交）；subset 为中间产物不提交。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import subsetFont from 'subset-font'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const charsPath = join(root, 'scripts', 'resume-chars.txt')
const ttfPath = join(root, 'public', 'fonts', 'SourceHanSerifSC-VF.ttf')
const ttfUrl =
  'https://github.com/adobe-fonts/source-han-serif/raw/release/Variable/TTF/SourceHanSerifSC-VF.ttf'
const outPath = join(root, 'public', 'fonts', 'SourceHanSerifSC-VF-subset.woff2')

if (!existsSync(charsPath)) {
  console.error('Run first: npx tsx scripts/extract-resume-chars.ts > scripts/resume-chars.txt')
  process.exit(1)
}

const cacheTtfPath = join(root, 'scripts', '.font-cache', 'SourceHanSerifSC-VF.ttf')
let fontBuffer: Buffer
if (existsSync(ttfPath)) {
  fontBuffer = readFileSync(ttfPath)
} else if (existsSync(cacheTtfPath)) {
  fontBuffer = readFileSync(cacheTtfPath)
  mkdirSync(join(root, 'public', 'fonts'), { recursive: true })
  writeFileSync(ttfPath, fontBuffer)
  console.log('Copied TTF to public/fonts/ (please commit this file).')
} else {
  console.log('Downloading Source Han Serif SC TTF to public/fonts/ (please commit this file)...')
  const res = await fetch(ttfUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  fontBuffer = Buffer.from(await res.arrayBuffer())
  mkdirSync(join(root, 'public', 'fonts'), { recursive: true })
  writeFileSync(ttfPath, fontBuffer)
}

const text = readFileSync(charsPath, 'utf8')
const subsetBuffer = await subsetFont(fontBuffer, text, { targetFormat: 'woff2' })
writeFileSync(outPath, subsetBuffer as Buffer)

const before = (fontBuffer.length / 1024 / 1024).toFixed(2)
const after = (subsetBuffer.length / 1024 / 1024).toFixed(2)
console.log(`Subset font: ${before} MB → ${after} MB (${text.length} chars)`)
