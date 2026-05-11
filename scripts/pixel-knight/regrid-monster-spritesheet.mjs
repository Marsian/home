#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

function readArgs(argv) {
  const args = {
    source: '',
    out: '',
    grid: [12, 4],
    counts: [],
    cellSize: [256, 256],
    key: '#00ff00',
    baselineY: 190,
    maxSubjectSize: [112, 150],
    componentPad: 8,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!flag.startsWith('--')) continue

    if (flag === '--source') args.source = value
    if (flag === '--out') args.out = value
    if (flag === '--grid') args.grid = value.split('x').map(Number)
    if (flag === '--counts') args.counts = value.split(',').map(Number)
    if (flag === '--cell-size') args.cellSize = value.split('x').map(Number)
    if (flag === '--key') args.key = value
    if (flag === '--baseline-y') args.baselineY = Number(value)
    if (flag === '--max-subject-size') args.maxSubjectSize = value.split('x').map(Number)
    if (flag === '--component-pad') args.componentPad = Number(value)
    index += 1
  }

  if (!args.source || !args.out || args.counts.length === 0) {
    throw new Error('Usage: regrid-monster-spritesheet.mjs --source <raw.png> --out <strict.png> --grid 12x4 --counts 4,10,7,7')
  }

  return args
}

const python = String.raw`
import json
import math
import sys
from collections import deque
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print('Pillow is required. Install it with: python3 -m pip install Pillow', file=sys.stderr)
    sys.exit(2)

config = json.loads(sys.argv[1])
source = Path(config['source'])
out = Path(config['out'])
cols, rows = config['grid']
counts = config['counts']
cell_w, cell_h = config['cellSize']
key_hex = config['key'].lstrip('#')
key = tuple(int(key_hex[i:i+2], 16) for i in (0, 2, 4))
baseline_y = config['baselineY']
max_subject_w, max_subject_h = config['maxSubjectSize']
component_pad = config['componentPad']

def is_key_like(pixel):
    r, g, b, a = pixel
    if a == 0:
        return True
    color_dist = math.sqrt((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2)
    greenish = g > 75 and g > r * 1.08 and g > b * 1.08 and (g - min(r, b)) > 18
    return color_dist < 120 or greenish

def find_components(row_image):
    width, height = row_image.size
    pixels = list(row_image.getdata())
    mask = bytearray(0 if is_key_like(pixel) else 1 for pixel in pixels)
    seen = bytearray(width * height)
    components = []
    for y in range(height):
        for x in range(width):
            start = y * width + x
            if seen[start] or not mask[start]:
                continue
            q = deque([(x, y)])
            seen[start] = 1
            cells = []
            min_x = max_x = x
            min_y = max_y = y
            while q:
                cx, cy = q.popleft()
                idx = cy * width + cx
                cells.append(idx)
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if seen[nidx] or not mask[nidx]:
                        continue
                    seen[nidx] = 1
                    q.append((nx, ny))
            if len(cells) >= 120 and max_x - min_x >= 20 and max_y - min_y >= 20:
                components.append({
                    'bbox': (min_x, min_y, max_x + 1, max_y + 1),
                    'size': len(cells),
                })
    if not components:
        return []
    largest = max(component['size'] for component in components)
    body_components = [
        component for component in components
        if component['size'] >= largest * 0.12
    ]
    body_components.sort(key=lambda component: (component['bbox'][0] + component['bbox'][2]) / 2)
    return body_components

def transparent_key_pixels(image):
    rgba = image.convert('RGBA')
    data = []
    for pixel in rgba.getdata():
        if is_key_like(pixel):
            data.append((*key, 0))
        else:
            data.append(pixel)
    rgba.putdata(data)
    return rgba

if not source.exists():
    print(f'Missing source image: {source}', file=sys.stderr)
    sys.exit(1)

if len(counts) != rows:
    print(f'--counts must provide exactly {rows} row counts.', file=sys.stderr)
    sys.exit(1)

image = Image.open(source).convert('RGBA')
source_w, source_h = image.size
strict = Image.new('RGB', (cols * cell_w, rows * cell_h), key)

for row_index, expected_count in enumerate(counts):
    row_top = round(row_index * source_h / rows)
    row_bottom = round((row_index + 1) * source_h / rows)
    row_image = image.crop((0, row_top, source_w, row_bottom))
    components = find_components(row_image)
    if len(components) < expected_count:
        print(f'Row {row_index + 1} found {len(components)} components, expected {expected_count}.', file=sys.stderr)
        sys.exit(1)

    for col_index, component in enumerate(components[:expected_count]):
        min_x, min_y, max_x, max_y = component['bbox']
        crop_box = (
            max(0, min_x - component_pad),
            max(0, min_y - component_pad),
            min(row_image.width, max_x + component_pad),
            min(row_image.height, max_y + component_pad),
        )
        subject_cell = transparent_key_pixels(row_image.crop(crop_box))
        bbox = subject_cell.getchannel('A').getbbox()
        if not bbox:
            continue
        subject = subject_cell.crop(bbox)
        if subject.width > max_subject_w or subject.height > max_subject_h:
            scale = min(max_subject_w / subject.width, max_subject_h / subject.height)
            subject = subject.resize(
                (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
                Image.Resampling.NEAREST,
            )

        cell = Image.new('RGBA', (cell_w, cell_h), (*key, 255))
        paste_x = round((cell_w - subject.width) / 2)
        paste_y = baseline_y - subject.height
        paste_y = max(12, min(cell_h - subject.height - 20, paste_y))
        cell.alpha_composite(subject, (paste_x, paste_y))
        strict.paste(cell.convert('RGB'), (col_index * cell_w, row_index * cell_h))

out.parent.mkdir(parents=True, exist_ok=True)
strict.save(out)
print(f'Regridded {source_w}x{source_h} source into {strict.width}x{strict.height} strict sheet ({cols}x{rows}).')
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
