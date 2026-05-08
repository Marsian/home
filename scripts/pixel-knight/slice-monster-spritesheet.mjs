#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const DEFAULT_STATES = [
  { name: 'idle', row: 0, frames: 6, frameDurationMs: 120, loop: true },
  { name: 'walk', row: 1, frames: 6, frameDurationMs: 110, loop: true },
  { name: 'attack', row: 2, frames: 8, frameDurationMs: 90, loop: false },
  { name: 'attacked', row: 3, frames: 4, frameDurationMs: 115, loop: false },
]

function readArgs(argv) {
  const args = {
    source: 'src/game-center/pixel-knight/monsters/slime/source-green/slime-actions-greenscreen.png',
    out: 'src/game-center/pixel-knight/monsters/slime/frames',
    meta: 'src/game-center/pixel-knight/monsters/slime/monster.meta.json',
    id: 'slime',
    name: '史莱姆',
    defaultState: 'idle',
    frameSize: [256, 256],
    anchor: [128, 190],
    grid: [8, 4],
    key: '#00ff00',
    states: DEFAULT_STATES,
    normalizeSource: true,
    autoDetect: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!flag.startsWith('--')) continue

    if (flag === '--source') args.source = value
    if (flag === '--out') args.out = value
    if (flag === '--meta') args.meta = value
    if (flag === '--id') args.id = value
    if (flag === '--name') args.name = value
    if (flag === '--default-state') args.defaultState = value
    if (flag === '--frame-size') args.frameSize = value.split('x').map(Number)
    if (flag === '--anchor') args.anchor = value.split(',').map(Number)
    if (flag === '--grid') args.grid = value.split('x').map(Number)
    if (flag === '--key') args.key = value
    if (flag === '--states') args.states = value.split(',').map((part) => {
      const [name, row, frames, frameDurationMs, loop] = part.split(':')
      return {
        name,
        row: Number(row),
        frames: Number(frames),
        frameDurationMs: Number(frameDurationMs),
        loop: loop === 'true',
      }
    })
    if (flag === '--no-normalize-source') args.normalizeSource = false
    if (flag === '--auto-detect') args.autoDetect = true
    if (flag !== '--no-normalize-source' && flag !== '--auto-detect') index += 1
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
out_root = Path(config['out'])
meta_path = Path(config['meta'])
frame_width, frame_height = config['frameSize']
anchor_x, anchor_y = config['anchor']
cols, rows = config['grid']
key_hex = config['key'].lstrip('#')
key = tuple(int(key_hex[i:i+2], 16) for i in (0, 2, 4))
green_threshold = 8
weak_green_threshold = 0
edge_padding = 2

def is_green_fringe(r, g, b, a):
    if a == 0:
        return False
    strong_green = g > 78 and g > r + 28 and g > b + 24
    muted_green = g > 82 and g > r * 1.08 and g > b * 1.08 and (g - min(r, b)) > 18
    near_key_dark = g > 70 and r < 70 and b < 55 and g > r * 1.7 and g > b * 1.7
    return strong_green or muted_green or near_key_dark

def is_key_like(pixel):
    r, g, b, a = pixel
    if a == 0:
        return True
    color_dist = math.sqrt((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2)
    green_dominant = is_green_fringe(r, g, b, a)
    very_close = color_dist < 92
    return very_close or green_dominant

def despill(pixel):
    r, g, b, a = pixel
    if a == 0:
        return (0, 0, 0, 0)
    if g > 72 and g > r * 1.04 and g > b * 1.04:
        g = int(min(g, max(r, b) * 0.72))
    return (r, g, b, a)

def sanitize_green_pixels(image):
    rgba = image.convert('RGBA')
    cleaned = []
    for r, g, b, a in rgba.getdata():
        if is_green_fringe(r, g, b, a):
            cleaned.append((0, 0, 0, 0))
        else:
            cleaned.append(despill((r, g, b, a)))
    rgba.putdata(cleaned)
    return rgba

def cleanup_components(mask, width, height):
    seen = bytearray(width * height)
    keep = bytearray(width * height)
    components = []
    for y in range(height):
        for x in range(width):
            start = y * width + x
            if seen[start] or not mask[start]:
                continue
            q = deque([(x, y)])
            seen[start] = 1
            cells = []
            while q:
                cx, cy = q.popleft()
                idx = cy * width + cx
                cells.append(idx)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    nidx = ny * width + nx
                    if seen[nidx] or not mask[nidx]:
                        continue
                    seen[nidx] = 1
                    q.append((nx, ny))
            if len(cells) >= 10:
                components.append(cells)
    if not components:
        return keep
    components.sort(key=len, reverse=True)
    largest = len(components[0])
    for cells in components:
        if len(cells) < largest * 0.18:
            continue
        for idx in cells:
            keep[idx] = 1
    return keep

def find_components(mask, width, height, min_size=80):
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
            if len(cells) >= min_size:
                components.append({
                    'cells': cells,
                    'bbox': (min_x, min_y, max_x + 1, max_y + 1),
                    'size': len(cells),
                })
    return components

def key_out_without_component_cleanup(image):
    rgba = image.convert('RGBA')
    pixels = list(rgba.getdata())
    result = []
    mask = bytearray()
    for pixel in pixels:
        if is_key_like(pixel):
            result.append((0, 0, 0, 0))
            mask.append(0)
        else:
            result.append(despill(pixel[:3] + (255,)))
            mask.append(1)
    rgba.putdata(result)
    return rgba, mask

def auto_detect_cells(row_image, expected_count):
    keyed, mask = key_out_without_component_cleanup(row_image)
    width, height = keyed.size
    components = find_components(mask, width, height, min_size=max(80, int(width * height * 0.00055)))
    if not components:
        return []
    largest = max(component['size'] for component in components)
    body_components = [
        component for component in components
        if component['size'] >= largest * 0.2
        and component['bbox'][2] - component['bbox'][0] >= 12
        and component['bbox'][3] - component['bbox'][1] >= 24
    ]
    body_components.sort(key=lambda component: (component['bbox'][0] + component['bbox'][2]) / 2)
    cells = []
    for component in body_components[:expected_count]:
        min_x, min_y, max_x, max_y = component['bbox']
        pad = 6
        crop_box = (
            max(0, min_x - pad),
            max(0, min_y - pad),
            min(width, max_x + pad),
            min(height, max_y + pad),
        )
        cells.append(keyed.crop(crop_box))
    return cells

def key_out_cell(cell):
    rgba = cell.convert('RGBA')
    width, height = rgba.size
    pixels = list(rgba.getdata())
    mask = bytearray(1 if not is_key_like(pixel) else 0 for pixel in pixels)
    mask = cleanup_components(mask, width, height)
    result = []
    for index, pixel in enumerate(pixels):
        if not mask[index]:
            result.append((0, 0, 0, 0))
        else:
            result.append(despill(pixel[:3] + (255,)))
    rgba.putdata(result)
    return rgba

def alpha_bbox(image):
    return image.getchannel('A').getbbox()

def normalize_source_image(image):
    rgba = image.convert('RGBA')
    pixels = []
    for pixel in rgba.getdata():
        if is_key_like(pixel):
            pixels.append((*key, 255))
        else:
            pixels.append(pixel)
    rgba.putdata(pixels)
    return rgba.convert('RGB')

def paste_centered(cell):
    bbox = alpha_bbox(cell)
    canvas = Image.new('RGBA', (frame_width, frame_height), (0, 0, 0, 0))
    if not bbox:
        return canvas, None
    subject = cell.crop(bbox)
    max_w = frame_width - 24
    max_h = frame_height - 24
    if subject.width > max_w or subject.height > max_h:
        scale = min(max_w / subject.width, max_h / subject.height)
        subject = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.NEAREST)
    x = round(anchor_x - subject.width / 2)
    y = round(anchor_y - subject.height)
    x = max(12, min(frame_width - subject.width - 12, x))
    y = max(8, min(frame_height - subject.height - 8, y))
    canvas.alpha_composite(subject, (x, y))
    canvas = sanitize_green_pixels(canvas)
    return canvas, canvas.getchannel('A').getbbox()

if not source.exists():
    print(f'Missing source image: {source}', file=sys.stderr)
    sys.exit(1)

image = Image.open(source).convert('RGBA')
source_w, source_h = image.size
cell_w = source_w / cols
cell_h = source_h / rows

if config.get('normalizeSource', True):
    normalize_source_image(image).save(source)
    image = Image.open(source).convert('RGBA')

out_root.mkdir(parents=True, exist_ok=True)
animations = {}
report = []

for state in config['states']:
    state_name = state['name']
    state_dir = out_root / state_name
    if state_dir.exists():
        for old in state_dir.glob('frame-*.png'):
            old.unlink()
    state_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    for frame_index in range(state['frames']):
        if config.get('autoDetect', False):
            if frame_index == 0:
                upper = round(state['row'] * cell_h)
                lower = round((state['row'] + 1) * cell_h)
                detected_cells = auto_detect_cells(image.crop((0, upper, source_w, lower)), state['frames'])
                if len(detected_cells) < state['frames']:
                    raise RuntimeError(f'Auto-detect found {len(detected_cells)} frames for {state_name}, expected {state["frames"]}')
            keyed = detected_cells[frame_index]
        else:
            left = round(frame_index * cell_w)
            upper = round(state['row'] * cell_h)
            right = round((frame_index + 1) * cell_w)
            lower = round((state['row'] + 1) * cell_h)
            cell = image.crop((left, upper, right, lower))
            keyed = key_out_cell(cell)
        canvas, bbox = paste_centered(keyed)
        frame_name = f'frame-{frame_index + 1:02d}.png'
        relative = f'frames/{state_name}/{frame_name}'
        frame_path = out_root / state_name / frame_name
        canvas.save(frame_path)
        frames.append(relative)

        data = list(canvas.convert('RGBA').getdata())
        corners = [data[0][3], data[frame_width - 1][3], data[(frame_height - 1) * frame_width][3], data[-1][3]]
        greenish = sum(1 for r, g, b, a in data if a > 8 and g > 110 and g > r * 1.2 and g > b * 1.1)
        weak_greenish = sum(1 for r, g, b, a in data if is_green_fringe(r, g, b, a))
        touches = bool(bbox and (bbox[0] <= edge_padding or bbox[1] <= edge_padding or bbox[2] >= frame_width - edge_padding or bbox[3] >= frame_height - edge_padding))
        report.append({
            'state': state_name,
            'frame': frame_name,
            'bbox': bbox,
            'corners': corners,
            'greenish': greenish,
            'weakGreenish': weak_greenish,
            'touchesEdge': touches,
        })
        if any(corners):
            raise RuntimeError(f'{relative} failed transparent-corner check: {corners}')
        if greenish > green_threshold:
            raise RuntimeError(f'{relative} has too many green fringe pixels: {greenish}')
        if weak_greenish > weak_green_threshold:
            raise RuntimeError(f'{relative} has weak green fringe pixels: {weak_greenish}')
        if touches:
            raise RuntimeError(f'{relative} subject touches frame edge: {bbox}')

    animations[state_name] = {
        'frameDurationMs': state['frameDurationMs'],
        'loop': state['loop'],
        'frames': frames,
    }

meta = {
    'id': config['id'],
    'name': config['name'],
    'defaultState': config['defaultState'],
    'frameSize': [frame_width, frame_height],
    'anchor': [anchor_x, anchor_y],
    'animations': animations,
}

meta_path.parent.mkdir(parents=True, exist_ok=True)
meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print(f'Sliced {sum(s["frames"] for s in config["states"])} frames from {source_w}x{source_h} source ({cols}x{rows} grid).')
for item in report:
    print(f'{item["state"]}/{item["frame"]}: bbox={item["bbox"]} greenish={item["greenish"]} weakGreenish={item["weakGreenish"]}')
print(f'Updated {meta_path}')
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
