from pathlib import Path
from PIL import Image, ImageDraw
from collections import deque
import math

RAW_SRC = Path('src/game-center/pixel-knight/assets/village/starter-village-spritesheet.png')
ALPHA_SRC = Path('src/game-center/pixel-knight/assets/village/starter-village-spritesheet-alpha.png')
OUT = Path('src/game-center/pixel-knight/assets/village/sliced')

if not RAW_SRC.exists():
    raise SystemExit(
        "Missing starter-village-spritesheet.png — legacy village sliced pipeline assets were removed from the repo. "
        "Runtime village uses maps/starter-village/backdrop.png. Restore sources from git history to run this script, "
        "or use scripts/slice-pixel-knight-v7-village-cutouts.py for atom slicing."
    )
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob('*.png'):
    old.unlink()

ASSETS = {
    'landmark-portal-gate': (807, 18, 1122, 327),
    'landmark-shop-stall': (1145, 30, 1492, 332),
    'tile-grass-white-flowers': (36, 55, 133, 150),
    'tile-grass-daisies': (161, 55, 259, 150),
    'tile-grass-yellow-flowers': (287, 55, 386, 150),
    'tile-grass-rocks': (412, 55, 509, 150),
    'tile-grass-mixed': (533, 55, 629, 150),
    'tile-dirt-round': (654, 55, 751, 150),
    'tile-grass-cliff-corner-left': (36, 177, 132, 284),
    'tile-grass-cliff-corner-right': (162, 178, 258, 284),
    'tile-grass-cliff-edge': (287, 178, 385, 260),
    'tile-grass-cliff-inner-left': (412, 177, 509, 283),
    'tile-grass-cliff-inner-right': (533, 178, 629, 284),
    'tile-grass-plain': (654, 178, 751, 284),
    'tile-dirt-plain': (37, 335, 132, 426),
    'tile-dirt-straight': (160, 335, 256, 426),
    'tile-dirt-corner': (287, 335, 388, 426),
    'tile-dirt-edge': (417, 335, 512, 426),
    'landmark-storage-chest': (550, 349, 866, 613),
    'landmark-blacksmith-forge': (893, 351, 1190, 627),
    'landmark-notice-board': (1222, 376, 1484, 622),
    'tile-dirt-vertical-edge': (37, 456, 132, 589),
    'tile-dirt-t-junction': (160, 456, 388, 589),
    'tile-dirt-vertical-edge-alt': (417, 456, 512, 589),
    'tile-plaza-stone': (36, 650, 159, 768),
    'tile-plaza-mossy': (183, 650, 311, 768),
    'tile-plaza-circle': (336, 650, 462, 768),
    'tile-plaza-diamond': (488, 650, 611, 768),
    'tile-plaza-cracked': (636, 650, 758, 768),
    'landmark-lantern-post': (849, 656, 941, 804),
    'decor-hanging-sign': (1333, 803, 1457, 975),
    'decor-signpost-double': (1110, 813, 1198, 969),
    'decor-grass-patch-flowers': (421, 817, 575, 970),
    'decor-grass-patch-large': (40, 818, 196, 968),
    'decor-grass-patch-rock': (237, 818, 388, 970),
    'decor-bush-leafy': (609, 818, 735, 966),
    'decor-pine-small': (1002, 831, 1079, 969),
    'decor-signpost-single': (1232, 839, 1316, 968),
    'decor-bush-berry': (884, 858, 978, 968),
    'decor-bush-flower': (768, 861, 864, 965),
}

BG_COLORS = [
    (255, 255, 255), (246, 246, 246), (244, 244, 244), (236, 236, 236),
    (229, 229, 229), (221, 221, 221), (211, 211, 211), (198, 198, 198),
    (185, 185, 185), (170, 170, 170), (150, 150, 150), (128, 128, 128),
]


def color_distance(a, b):
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))


def is_checker_bg(r, g, b):
    # Remove white/gray checkerboard, including darker gray leftovers. Keep colored highlights.
    if max(r, g, b) - min(r, g, b) > 18:
        return False
    if r >= 112 and g >= 112 and b >= 112:
        return True
    return any(color_distance((r, g, b), color) <= 30 for color in BG_COLORS)


def alpha_clean_source(raw: Image.Image) -> Image.Image:
    image = raw.convert('RGBA')
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if is_checker_bg(r, g, b):
                pixels[x, y] = (r, g, b, 0)
    return image


def crop_with_padding(source: Image.Image, box: tuple[int, int, int, int], padding: int = 4, aggressive_green_edge: bool = False) -> Image.Image:
    left, top, right, bottom = box
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(source.width, right + padding)
    bottom = min(source.height, bottom + padding)
    cropped = source.crop((left, top, right, bottom)).convert('RGBA')
    return trim_and_decontaminate(cropped, aggressive_green_edge=aggressive_green_edge)


def trim_and_decontaminate(image: Image.Image, padding: int = 2, aggressive_green_edge: bool = False) -> Image.Image:
    pixels = image.load()
    width, height = image.size
    # Remove any remaining neutral background pixels globally; deep gray checker remnants included.
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a and is_checker_bg(r, g, b):
                pixels[x, y] = (r, g, b, 0)
    # Trim transparent bounds.
    box = image.getchannel('A').getbbox()
    if not box:
        return image
    left, top, right, bottom = box
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(width, right + padding)
    bottom = min(height, bottom + padding)
    image = image.crop((left, top, right, bottom)).convert('RGBA')
    pixels = image.load()
    width, height = image.size
    if aggressive_green_edge:
        clean_green_fringe(image)
        pixels = image.load()
        width, height = image.size
    # Contract only neutral fringe pixels connected to transparent edge, preserving true dark outlines.
    visited = bytearray(width * height)
    queue = deque()
    for x in range(width):
        queue.append((x, 0)); queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y)); queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        if x < 0 or x >= width or y < 0 or y >= height:
            continue
        idx = y * width + x
        if visited[idx]:
            continue
        visited[idx] = 1
        r, g, b, a = pixels[x, y]
        removable = a == 0 or is_checker_bg(r, g, b)
        if not removable:
            continue
        if a:
            pixels[x, y] = (r, g, b, 0)
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return image



def is_green_edge_fringe(r: int, g: int, b: int, a: int) -> bool:
    if a == 0:
        return False
    sat = max(r, g, b) - min(r, g, b)
    # Neutral or washed-out checker remnants that sit on green asset edges.
    if r >= 150 and g >= 150 and b >= 135 and sat <= 92:
        return True
    if r >= 185 and g >= 185 and b >= 155:
        return True
    if r >= 128 and g >= 150 and b >= 115 and sat <= 88:
        return True
    return False


def clean_green_fringe(image: Image.Image) -> None:
    pixels = image.load()
    width, height = image.size
    for _ in range(5):
        remove = []
        soften = []
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                transparent_neighbors = 0
                dark_neighbors = 0
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1),(x+1,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1)):
                    if nx < 0 or nx >= width or ny < 0 or ny >= height or pixels[nx, ny][3] == 0:
                        transparent_neighbors += 1
                    else:
                        nr, ng, nb, na = pixels[nx, ny]
                        if na and max(nr, ng, nb) < 90:
                            dark_neighbors += 1
                if transparent_neighbors == 0:
                    continue
                if is_green_edge_fringe(r, g, b, a):
                    remove.append((x, y))
                elif transparent_neighbors >= 3 and dark_neighbors == 0 and r > 112 and g > 128 and b > 88:
                    soften.append((x, y, max(96, int(a * 0.55))))
        for x, y in remove:
            r, g, b, a = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)
        for x, y, na in soften:
            r, g, b, a = pixels[x, y]
            if pixels[x, y][3] != 0:
                pixels[x, y] = (r, g, b, na)


def remove_detected_green_edge_noise(image: Image.Image) -> None:
    pixels = image.load()
    width, height = image.size
    changed = True
    while changed:
        changed = False
        remove = []
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if not is_green_edge_fringe(r, g, b, a):
                    continue
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                    if nx < 0 or nx >= width or ny < 0 or ny >= height or pixels[nx, ny][3] == 0:
                        remove.append((x, y))
                        break
        if remove:
            changed = True
            for x, y in remove:
                r, g, b, a = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)

def count_green_edge_noise(image: Image.Image) -> int:
    pixels = image.load()
    width, height = image.size
    count = 0
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if not is_green_edge_fringe(r, g, b, a):
                continue
            for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if nx < 0 or nx >= width or ny < 0 or ny >= height or pixels[nx, ny][3] == 0:
                    count += 1
                    break
    return count


def count_neutral_edge_noise(image: Image.Image) -> int:
    pixels = image.load()
    width, height = image.size
    count = 0
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if not a or not is_checker_bg(r, g, b):
                continue
            has_transparent_neighbor = False
            for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if nx < 0 or nx >= width or ny < 0 or ny >= height or pixels[nx, ny][3] == 0:
                    has_transparent_neighbor = True
                    break
            if has_transparent_neighbor:
                count += 1
    return count


def make_contact_sheet(files: list[Path]) -> None:
    thumb_w, thumb_h = 176, 154
    cols = 5
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * thumb_w, rows * thumb_h), (245, 238, 220, 255))
    draw = ImageDraw.Draw(sheet)
    for index, file in enumerate(files):
        image = Image.open(file).convert('RGBA')
        image.thumbnail((132, 104), Image.Resampling.NEAREST)
        x = (index % cols) * thumb_w + (thumb_w - image.width) // 2
        y = (index // cols) * thumb_h + 8
        sheet.alpha_composite(image, (x, y))
        draw.text(((index % cols) * thumb_w + 6, (index // cols) * thumb_h + 118), file.stem[:26], fill=(40, 32, 24, 255))
    sheet.save(OUT / '_contact-sheet.png')


def main() -> None:
    raw = Image.open(RAW_SRC).convert('RGBA')
    source = alpha_clean_source(raw)
    source.save(ALPHA_SRC)
    written: list[Path] = []
    noise_total = 0
    for name, box in ASSETS.items():
        image = crop_with_padding(source, box, aggressive_green_edge=(name.startswith('tile-grass') or name.startswith('decor-grass') or name.startswith('decor-bush') or name.startswith('decor-pine')))
        if image.getchannel('A').getbbox() is None:
            raise RuntimeError(f'{name} is empty')
        if name.startswith('tile-grass') or name.startswith('decor-grass') or name.startswith('decor-bush') or name.startswith('decor-pine'):
            remove_detected_green_edge_noise(image)
            image = trim_and_decontaminate(image, aggressive_green_edge=True)
        noise = count_neutral_edge_noise(image)
        green_noise = count_green_edge_noise(image) if (name.startswith('tile-grass') or name.startswith('decor-grass') or name.startswith('decor-bush') or name.startswith('decor-pine')) else 0
        noise_total += noise + green_noise
        path = OUT / f'{name}.png'
        image.save(path)
        written.append(path)
        print(f'{path.name} {image.width}x{image.height} edge_noise={noise} green_edge_noise={green_noise}')
    make_contact_sheet(sorted(written))
    print(f'wrote {len(written)} assets + _contact-sheet.png; edge_noise_total={noise_total}')
    if noise_total:
        raise SystemExit('neutral edge noise remains')


if __name__ == '__main__':
    main()
