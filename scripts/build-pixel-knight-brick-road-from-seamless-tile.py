#!/usr/bin/env python3
"""Build road terrain PNGs from seamless cobble source (`brick-road-seamless-tile-source.png`).

Outputs:
  terrain-brick-road-vertical.png · terrain-brick-road-horizontal.png

Village ground elsewhere is grass-only patches — no plaza overlay.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

# One period matches full road width → only 3 repeats along a 720 strip (less “macro grid”).
TILE = 240
VERT = (240, 720)  # 1 col × 3 rows
HORIZ = (720, 240)  # 3 cols × 1 row


def center_square(im: Image.Image) -> Image.Image:
    w, h = im.size
    s = min(w, h)
    x0 = (w - s) // 2
    y0 = (h - s) // 2
    return im.crop((x0, y0, x0 + s, y0 + s))


def clamp_tile(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    sz = TILE
    im = im.resize((sz, sz), Image.Resampling.NEAREST)
    rgb = im.convert("RGB")
    pal = rgb.quantize(colors=36, method=Image.Quantize.MEDIANCUT)
    out = pal.convert("RGBA")
    return weld_toroidal(out)


def weld_toroidal(im: Image.Image) -> Image.Image:
    """Make bottom row match top, right column match left — torus wrap for stacked tile copies."""
    im = im.copy()
    w, h = im.size
    px = im.load()
    for x in range(w):
        px[x, h - 1] = px[x, 0]
    for y in range(h):
        px[w - 1, y] = px[0, y]
    return im


def tile_grid(cell: Image.Image, cols: int, rows: int) -> Image.Image:
    cw, ch = cell.size
    assert cw == TILE and ch == TILE, (cw, ch, TILE)
    out = Image.new("RGBA", (cols * TILE, rows * TILE))
    for j in range(rows):
        for i in range(cols):
            out.paste(cell, (i * TILE, j * TILE))
    return out


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    default_src = (
        root / "src/game-center/pixel-knight/assets/village/terrain/brick-road-seamless-tile-source.png"
    )
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", type=Path, default=default_src)
    args = parser.parse_args()
    src_path: Path = args.source

    raw = Image.open(src_path)
    sq = center_square(raw)
    tile = clamp_tile(sq)

    v = tile_grid(tile, cols=1, rows=3)
    h = tile_grid(tile, cols=3, rows=1)
    assert v.size == VERT and h.size == HORIZ

    terrain = root / "src/game-center/pixel-knight/assets/village/terrain"
    v.save(terrain / "terrain-brick-road-vertical.png", optimize=True)
    h.save(terrain / "terrain-brick-road-horizontal.png", optimize=True)
    print("wrote brick vertical", terrain / "terrain-brick-road-vertical.png", v.size)
    print("wrote brick horiz ", terrain / "terrain-brick-road-horizontal.png", h.size)


if __name__ == "__main__":
    main()
