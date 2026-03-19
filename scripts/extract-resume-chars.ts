/**
 * 从 resumeContent 与页面固定文案中收集所有会渲染的字符，输出到 stdout，供 subset-font 使用。
 * 运行：npx tsx scripts/extract-resume-chars.ts > scripts/resume-chars.txt
 */
import { resumeContents } from '../src/resume/resumeContent'

const chars = new Set<string>()

// 页面中固定的中文与符号（ResumePage 里出现的）
const staticUi = '：·（）—、，。；：'.split('')
staticUi.forEach((c) => chars.add(c))

function collect(s: string) {
  for (const c of s) chars.add(c)
}

function walk(block: (typeof resumeContents)[number]) {
  if (block.type === 'header') {
    collect(block.data.name)
    block.data.contacts?.forEach((c) => {
      collect(c.label)
      collect(c.value)
      if (c.display) collect(c.display)
    })
    return
  }
  if ('title' in block) collect(block.title)
  if (block.type === 'experience') {
    block.data.items.forEach((ex) => {
      collect(ex.company)
      collect(ex.role)
      collect(ex.period)
      ex.bullets.forEach((b) => collect(b))
    })
    return
  }
  if (block.type === 'education') {
    block.data.items.forEach((e) => {
      collect(e.school)
      collect(e.period)
      if (e.degree) collect(e.degree)
      e.bullets?.forEach((b) => collect(b))
    })
    return
  }
  if (block.type === 'skills') {
    block.data.items.forEach((s) => collect(s))
    return
  }
  if (block.type === 'licenses') {
    block.data.items.forEach((s) => collect(s))
  }
}

resumeContents.forEach(walk)

// 输出不重复的字符拼接成一行（subset-font 接受字符串）
process.stdout.write([...chars].sort().join(''))
