#!/usr/bin/env python3
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np


FULL = Path(
    "src/game-center/pixel-knight/assets/village/v7-front/full/starter-village-front-small-plaza-all-roads-connected.png"
)
ATOMS_DIR = Path("src/game-center/pixel-knight/assets/village/v7-front/atoms")
ATOMS_JSON = ATOMS_DIR / "atoms.json"
OUT_TS = Path("src/game-center/pixel-knight/game/maps/starterVillageV8Rows.ts")
OUT_OBJECTS_TS = Path("src/game-center/pixel-knight/game/maps/starterVillageV8Objects.ts")

TILE = 16


@dataclass(frozen=True)
class Match:
    id: str
    score: float
    x: int
    y: int
    w: int
    h: int


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def load_atoms() -> list[dict[str, Any]]:
    data = json.loads(ATOMS_JSON.read_text())
    if not isinstance(data, list):
        raise ValueError("atoms.json must be a list")
    return data


def match_one(full_gray: np.ndarray, templ_gray: np.ndarray, templ_mask: np.ndarray) -> tuple[float, int, int]:
    # Use CCORR_NORMED with mask (OpenCV supports mask for this method).
    res = cv2.matchTemplate(full_gray, templ_gray, cv2.TM_CCORR_NORMED, mask=templ_mask)
    _minVal, maxVal, _minLoc, maxLoc = cv2.minMaxLoc(res)
    return float(maxVal), int(maxLoc[0]), int(maxLoc[1])


def stamp_mask_to_grid(
    grid: list[list[str]],
    alpha_mask: np.ndarray,
    x0: int,
    y0: int,
    walkable_cells: set[tuple[int, int]],
    *,
    coverage_threshold: float = 0.33,
) -> None:
    """
    alpha_mask: uint8 (0/255) in template local coords (h,w)
    x0,y0: top-left in world pixels where template is placed
    """
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    h, w = alpha_mask.shape[:2]

    c0 = max(0, min(cols - 1, x0 // TILE))
    c1 = max(0, min(cols, ceil_div(x0 + w, TILE)))
    r0 = max(0, min(rows - 1, y0 // TILE))
    r1 = max(0, min(rows, ceil_div(y0 + h, TILE)))

    for r in range(r0, r1):
        for c in range(c0, c1):
            if (c, r) in walkable_cells:
                continue
            cell_x0 = c * TILE
            cell_y0 = r * TILE
            cell_x1 = cell_x0 + TILE
            cell_y1 = cell_y0 + TILE

            ix0 = max(0, cell_x0 - x0)
            iy0 = max(0, cell_y0 - y0)
            ix1 = min(w, cell_x1 - x0)
            iy1 = min(h, cell_y1 - y0)
            if ix1 <= ix0 or iy1 <= iy0:
                continue
            patch = alpha_mask[iy0:iy1, ix0:ix1]
            covered = float(np.count_nonzero(patch))
            area = float(patch.size)
            if area <= 0:
                continue
            if covered / area >= coverage_threshold:
                grid[r][c] = "#"


def compute_base_mask(alpha_mask: np.ndarray, *, base_fraction: float = 0.22) -> np.ndarray:
    """
    Keep only the bottom `base_fraction` band of the sprite alpha. This approximates
    the "footprint/base" that should block movement while allowing the player to walk
    behind the upper parts for proper occlusion.
    """
    h = alpha_mask.shape[0]
    start = max(0, int(math.floor(h * (1.0 - base_fraction))))
    base = np.zeros_like(alpha_mask)
    base[start:, :] = alpha_mask[start:, :]
    return base


def compute_base_y(alpha_mask: np.ndarray) -> int:
    ys, _xs = np.where(alpha_mask > 0)
    if ys.size == 0:
        return 0
    return int(np.max(ys))


def compute_walkable_cells(full_bgr: np.ndarray, cols: int, rows: int, pad_x: int, pad_y: int) -> set[tuple[int, int]]:
    """
    Approximate walkable surface from the full background image:
    - road: tan/orange dirt path
    - plaza: gray stone tiles
    Returns set of (col,row) cells that should stay walkable even if stamped by object masks.
    """
    hsv = cv2.cvtColor(full_bgr, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    # Road (tan): hue ~10-30, mid-high sat, mid-high value.
    road = ((h >= 8) & (h <= 28) & (s >= 70) & (s <= 210) & (v >= 80) & (v <= 240))
    # Plaza (gray stones): low saturation, mid value.
    plaza = (s <= 55) & (v >= 90) & (v <= 220)

    walkable = road | plaza
    walkable = walkable.astype(np.uint8)
    walkable = cv2.morphologyEx(walkable, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)

    cells: set[tuple[int, int]] = set()
    full_h, full_w = full_bgr.shape[:2]

    for r in range(rows):
        for c in range(cols):
            wx0 = c * TILE - pad_x
            wy0 = r * TILE - pad_y
            wx1 = wx0 + TILE
            wy1 = wy0 + TILE
            ix0 = max(0, wx0)
            iy0 = max(0, wy0)
            ix1 = min(full_w, wx1)
            iy1 = min(full_h, wy1)
            if ix1 <= ix0 or iy1 <= iy0:
                continue
            patch = walkable[iy0:iy1, ix0:ix1]
            if patch.size <= 0:
                continue
            if float(np.count_nonzero(patch)) / float(patch.size) >= 0.55:
                cells.add((c, r))

    return cells


def detect_portal_cell(full_bgr: np.ndarray, cols: int, rows: int, pad_x: int, pad_y: int) -> tuple[int, int]:
    # Heuristic: portal disk contains saturated blue/cyan pixels.
    b, g, r = cv2.split(full_bgr)
    blueish = (b.astype(np.int16) - g.astype(np.int16) > 45) & (b.astype(np.int16) - r.astype(np.int16) > 45) & (b > 160)
    ys, xs = np.where(blueish)
    if xs.size < 200:
        # Fallback to center.
        return cols // 2, rows // 2
    cx = int(np.mean(xs))
    cy = int(np.mean(ys))
    world_x = cx + pad_x
    world_y = cy + pad_y
    return max(0, min(cols - 1, world_x // TILE)), max(0, min(rows - 1, world_y // TILE))


def main() -> None:
    if not ATOMS_JSON.exists():
        raise SystemExit("Missing atoms.json. Run scripts/slice-pixel-knight-v7-village-cutouts.py first.")

    full_bgr = cv2.imread(str(FULL), cv2.IMREAD_COLOR)
    if full_bgr is None:
        raise SystemExit(f"Failed to read {FULL}")

    full_h, full_w = full_bgr.shape[:2]
    cols = ceil_div(full_w, TILE)
    rows = ceil_div(full_h, TILE)
    world_w = cols * TILE
    world_h = rows * TILE
    pad_x = max(0, (world_w - full_w) // 2)
    pad_y = max(0, (world_h - full_h) // 2)

    # Start with walkable '.' and border walls.
    grid = [["." for _ in range(cols)] for _ in range(rows)]
    for x in range(cols):
        grid[0][x] = "#"
        grid[rows - 1][x] = "#"
    for y in range(rows):
        grid[y][0] = "#"
        grid[y][cols - 1] = "#"

    full_gray = cv2.cvtColor(full_bgr, cv2.COLOR_BGR2GRAY)
    walkable_cells = compute_walkable_cells(full_bgr, cols, rows, pad_x, pad_y)

    atoms = load_atoms()
    matches: list[Match] = []
    # Prefer matching bigger atoms first; atoms.json already sorted by area desc from the slicer.
    for atom in atoms:
        atom_id = str(atom["id"])
        atom_path = ATOMS_DIR / str(atom["file"])
        templ_bgra = cv2.imread(str(atom_path), cv2.IMREAD_UNCHANGED)
        if templ_bgra is None or templ_bgra.shape[2] != 4:
            continue

        alpha = templ_bgra[:, :, 3]
        # Ignore extremely sparse templates (can lead to false positives).
        if int(np.count_nonzero(alpha)) < 120:
            continue

        templ_gray = cv2.cvtColor(templ_bgra[:, :, :3], cv2.COLOR_BGR2GRAY)
        mask = (alpha > 0).astype(np.uint8) * 255

        score, x, y = match_one(full_gray, templ_gray, mask)
        h, w = templ_gray.shape[:2]
        matches.append(Match(id=atom_id, score=score, x=x, y=y, w=w, h=h))

    objects: list[dict[str, Any]] = []

    # Stamp collisions for all confident matches using alpha coverage (not bbox),
    # but only stamp the *base* of each sprite.
    # This avoids "over-blocking" wide bounding boxes with lots of transparent pixels.
    for m in matches:
        if m.score < 0.58:
            continue
        atom_path = ATOMS_DIR / f"{m.id}.png"
        templ_bgra = cv2.imread(str(atom_path), cv2.IMREAD_UNCHANGED)
        if templ_bgra is None or templ_bgra.shape[2] != 4:
            continue
        alpha = templ_bgra[:, :, 3]
        mask_full = (alpha > 0).astype(np.uint8) * 255
        mask_base = compute_base_mask(mask_full, base_fraction=0.22)
        # Erode slightly so footprint hugs visuals tighter.
        mask_base = cv2.erode(mask_base, np.ones((3, 3), np.uint8), iterations=1)
        x0 = m.x + pad_x
        y0 = m.y + pad_y
        stamp_mask_to_grid(grid, mask_base, x0, y0, walkable_cells, coverage_threshold=0.32)

        base_y = y0 + compute_base_y(mask_full)
        objects.append(
            {
                "id": m.id,
                "x": int(x0),
                "y": int(y0),
                "w": int(m.w),
                "h": int(m.h),
                "baseY": int(base_y),
            }
        )

    portal_cell = detect_portal_cell(full_bgr, cols, rows, pad_x, pad_y)

    # Start position heuristic: bottom-center road entrance.
    start_cell = (cols // 2, rows - 6)

    # Ensure portal is walkable: clear a small neighborhood and then stamp P.
    sx, sy = start_cell
    px, py = portal_cell
    grid[sy][sx] = "S"
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            yy = py + dy
            xx = px + dx
            if 0 <= yy < rows and 0 <= xx < cols:
                # Keep border walls intact.
                if yy in (0, rows - 1) or xx in (0, cols - 1):
                    continue
                grid[yy][xx] = "."
    grid[py][px] = "P"

    # Emit TS with rows + a small metadata export for hotspots tuning.
    row_strings = ["".join(r) for r in grid]
    meta = {
        "tile": TILE,
        "image": {"width": full_w, "height": full_h},
        "grid": {"cols": cols, "rows": rows, "worldWidth": world_w, "worldHeight": world_h, "padX": pad_x, "padY": pad_y},
        "portalCell": {"x": int(px), "y": int(py)},
        "startCell": {"x": int(sx), "y": int(sy)},
        "matchStats": {
            "totalAtoms": len(atoms),
            "matched": len(matches),
            "stamped": sum(1 for m in matches if m.score >= 0.55),
            "minScore": float(min((m.score for m in matches), default=0.0)),
            "maxScore": float(max((m.score for m in matches), default=0.0)),
        },
    }

    OUT_TS.parent.mkdir(parents=True, exist_ok=True)
    OUT_TS.write_text(
        "// Generated by scripts/build-pixel-knight-v7-village-collision-grid.py\n"
        "export const starterVillageV8Meta = "
        + json.dumps(meta, ensure_ascii=False, indent=2)
        + " as const;\n\n"
        "export const starterVillageV8Rows = [\n"
        + "\n".join([f"  {json.dumps(r)}," for r in row_strings])
        + "\n] as const;\n"
    )

    # Emit objects (for occlusion rendering).
    objects.sort(key=lambda o: (o["baseY"], o["id"]))
    OUT_OBJECTS_TS.write_text(
        "// Generated by scripts/build-pixel-knight-v7-village-collision-grid.py\n"
        "export type StarterVillageV8Object = {\n"
        "  id: string\n"
        "  x: number\n"
        "  y: number\n"
        "  w: number\n"
        "  h: number\n"
        "  baseY: number\n"
        "}\n\n"
        "export const starterVillageV8Objects: StarterVillageV8Object[] = "
        + json.dumps(objects, ensure_ascii=False, indent=2)
        + ";\n"
    )

    print(f"Wrote {OUT_TS}")
    print(f"Wrote {OUT_OBJECTS_TS}")
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

