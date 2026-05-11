#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

function parseRowConfig(value) {
  const [name, sourceDir, count, maxSize] = value.split(':')
  const [maxWidth, maxHeight] = maxSize.split('x').map(Number)
  return {
    name,
    sourceDir,
    count: Number(count),
    maxSize: [maxWidth, maxHeight],
  }
}

function readArgs(argv) {
  const args = {
    out: '',
    grid: [12, 4],
    cellSize: [256, 256],
    baselineY: 190,
    key: '#00ff00',
    rows: [],
  }

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!flag.startsWith('--')) continue

    if (flag === '--out') args.out = value
    if (flag === '--grid') args.grid = value.split('x').map(Number)
    if (flag === '--cell-size') args.cellSize = value.split('x').map(Number)
    if (flag === '--baseline-y') args.baselineY = Number(value)
    if (flag === '--key') args.key = value
    if (flag === '--row') args.rows.push(parseRowConfig(value))
    index += 1
  }

  if (!args.out || args.rows.length === 0) {
    throw new Error('Usage: compose-monster-spritesheet-from-frames.mjs --out <sheet.png> --row idle:<dir>:4:112x94')
  }

  return args
}

const python = String.raw`
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print('Pillow is required. Install it with: python3 -m pip install Pillow', file=sys.stderr)
    sys.exit(2)

config = json.loads(sys.argv[1])
cols, rows = config['grid']
cell_w, cell_h = config['cellSize']
baseline_y = config['baselineY']
key_hex = config['key'].lstrip('#')
key = tuple(int(key_hex[i:i+2], 16) for i in (0, 2, 4))
out = Path(config['out'])

if len(config['rows']) > rows:
    print(f'Too many --row entries for {rows} grid rows.', file=sys.stderr)
    sys.exit(1)

sheet = Image.new('RGB', (cols * cell_w, rows * cell_h), key)

for row_index, row in enumerate(config['rows']):
    source_dir = Path(row['sourceDir'])
    frame_paths = sorted(source_dir.glob('frame-*.png'))[:row['count']]
    if len(frame_paths) != row['count']:
        print(f'{row["name"]} expected {row["count"]} frames from {source_dir}, found {len(frame_paths)}.', file=sys.stderr)
        sys.exit(1)
    if row['count'] > cols:
        print(f'{row["name"]} has {row["count"]} frames but grid only has {cols} columns.', file=sys.stderr)
        sys.exit(1)

    frames = []
    max_source_w = 0
    max_source_h = 0
    for frame_path in frame_paths:
        image = Image.open(frame_path).convert('RGBA')
        bbox = image.getchannel('A').getbbox()
        if not bbox:
            print(f'{frame_path} has no visible pixels.', file=sys.stderr)
            sys.exit(1)
        frames.append((frame_path, image, bbox))
        max_source_w = max(max_source_w, bbox[2] - bbox[0])
        max_source_h = max(max_source_h, bbox[3] - bbox[1])

    max_width, max_height = row['maxSize']
    scale = min(max_width / max_source_w, max_height / max_source_h)

    for col_index, (_frame_path, image, bbox) in enumerate(frames):
        subject = image.crop(bbox)
        subject = subject.resize(
            (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
            Image.Resampling.NEAREST,
        )
        cell = Image.new('RGBA', (cell_w, cell_h), (*key, 255))
        paste_x = round((cell_w - subject.width) / 2)
        paste_y = baseline_y - subject.height
        paste_y = max(12, min(cell_h - subject.height - 20, paste_y))
        cell.alpha_composite(subject, (paste_x, paste_y))
        sheet.paste(cell.convert('RGB'), (col_index * cell_w, row_index * cell_h))

out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out)
print(f'Composed {sheet.width}x{sheet.height} strict sheet from {len(config["rows"])} row source(s).')
print(f'Updated {out}')
`

const args = readArgs(process.argv.slice(2))
const result = spawnSync('python3', ['-c', python, JSON.stringify(args)], {
  stdio: 'inherit',
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 0)
