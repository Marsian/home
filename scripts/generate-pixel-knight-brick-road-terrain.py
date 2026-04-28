#!/usr/bin/env python3
"""Seamlessly tileable pixel cobble strips for Pixel Knight village roads."""

from pathlib import Path
from PIL import Image

SRC_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = SRC_ROOT / 'src/game-center/pixel-knight/assets/village/terrain'

CELL_X = 40
# Must divide evenly into 240 & 720 (vertical strip) AND 720 & 240 (horizontal strip).
CELL_Y = 20
VG = 2
HG = 2

BRICK_W = CELL_X - 2 * VG
BRICK_H = CELL_Y - 2 * HG

MORTAR = (52, 48, 42, 255)
B_COLORS = [(132, 90, 64, 255), (122, 84, 62, 255), (112, 76, 58, 255)]
HIGHLIGHT = (176, 128, 96, 255)
LOWLIGHT = (80, 56, 44, 255)


def brick_color(ix: int, iy: int, bx: int, by: int) -> tuple[int, int, int, int]:
    variant = ((bx & 127) ^ (by << 7) ^ (ix << 11)) % len(B_COLORS)
    if ix < BRICK_W // 5 and iy < BRICK_H // 3:
        return HIGHLIGHT
    if ix >= BRICK_W * 5 // 6 and iy >= BRICK_H // 2:
        return LOWLIGHT
    return B_COLORS[(variant + bx + by * 11) % len(B_COLORS)]


def raster_brick_sheet(width: int, height: int) -> Image.Image:
    assert width % CELL_X == 0
    assert height % CELL_Y == 0

    half_shift = CELL_X // 2
    rows_rgba: list[list[tuple[int, int, int, int]]] = []

    for y in range(height):
        course = y // CELL_Y
        ly = y % CELL_Y
        mortar_row = ly < HG or ly >= CELL_Y - HG
        stag = half_shift if (course & 1) else 0

        row: list[tuple[int, int, int, int]] = []

        for x in range(width):
            xr = x + stag
            lx_cell = xr % CELL_X
            bx = xr // CELL_X
            by = course

            if mortar_row:
                row.append(MORTAR)
                continue

            # vertical grout inside cell
            if lx_cell < VG or lx_cell >= CELL_X - VG:
                row.append(MORTAR)
                continue

            lx_in = lx_cell - VG
            iy_in = ly - HG
            row.append(brick_color(lx_in, iy_in, bx, by))

        rows_rgba.append(row)

    img = Image.new('RGBA', (width, height))
    img.putdata([p for row in rows_rgba for p in row])
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    v_img = raster_brick_sheet(240, 720)
    h_img = raster_brick_sheet(720, 240)

    v_img.save(OUT_DIR / 'terrain-brick-road-vertical.png', optimize=True)
    h_img.save(OUT_DIR / 'terrain-brick-road-horizontal.png', optimize=True)

    print('terrain-brick-road-vertical.png:', v_img.size)
    print('terrain-brick-road-horizontal.png:', h_img.size)


if __name__ == '__main__':
    main()
