#!/usr/bin/env python3
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import numpy as np


SRC = Path(
    "src/game-center/pixel-knight/assets/village/v7-front/cutouts/imagegen-green/starter-village-collision-elements-imagegen-green-sheet.png"
)
OUT_DIR = Path("src/game-center/pixel-knight/maps/starter-village/atoms")
OUT_DIR.mkdir(parents=True, exist_ok=True)


GREEN_BGR = (0, 255, 0)
ATOM_NAMES = [
    "house-red",
    "house-yellow",
    "house-green",
    "house-blue",
    "forge",
    "banner-01",
    "banner-02",
    "portal",
    "fence-01",
    "fence-02",
    "brazier-01",
    "brazier-02",
    "brazier-03",
    "brazier-04",
    "board",
    "chest",
    "pine-01",
    "pine-02",
    "oak-01",
    "pine-03",
    "oak-02",
    "oak-03",
    "pine-04",
    "pine-05",
    "oak-04",
    "pine-06",
    "oak-05",
    "pine-07",
    "boulder-01",
    "boulder-02",
    "boulder-03",
    "boulder-04",
    "boulder-05",
    "boulder-06",
    "boulder-07",
    "boulder-08",
    "boulder-09",
    "boulder-10",
    "boulder-11",
    "barrel-01",
    "barrel-02",
    "crate-01",
    "barrel-03",
    "barrel-04",
    "barrel-05",
    "crate-02",
    "planter-01",
    "crate-03",
    "planter-02",
    "planter-03",
    "anvil-table",
    "crate-04",
]


@dataclass(frozen=True)
class AtomMeta:
    id: str
    file: str
    sheet_bbox: tuple[int, int, int, int]  # x,y,w,h in sheet pixels
    area: int


def remove_green_fringe(rgba: np.ndarray) -> np.ndarray:
    """Remove chroma-key spill near transparent sprite edges without recoloring inner foliage."""
    out = rgba.copy()
    rgb = out[:, :, :3].astype(np.int16)
    alpha = out[:, :, 3]
    opaque = alpha > 0
    if not np.any(opaque):
        return out

    dist = cv2.distanceTransform(opaque.astype(np.uint8), cv2.DIST_L2, 3)
    rr = rgb[:, :, 0]
    gg = rgb[:, :, 1]
    bb = rgb[:, :, 2]
    chroma = gg - np.maximum(rr, bb)

    key_fringe = (
        opaque
        & (dist <= 2.2)
        & (gg >= 145)
        & (chroma >= 70)
        & (rr <= 120)
        & (bb <= 105)
        & (gg >= rr * 1.28 + 28)
        & (gg >= bb * 1.45 + 35)
    )
    out[:, :, 3][key_fringe] = 0

    spill = (
        opaque
        & ~key_fringe
        & (dist <= 3.2)
        & (gg >= 135)
        & (chroma >= 55)
        & (rr <= 130)
        & (bb <= 120)
        & (gg >= rr * 1.18 + 20)
        & (gg >= bb * 1.25 + 25)
    )
    if not np.any(spill):
        return out

    good = opaque & ~key_fringe & ~spill & (dist <= 7.0)
    working_spill = spill.copy()
    for _ in range(4):
        good_u = good.astype(np.uint8)
        sum_rgb = np.zeros((*alpha.shape, 3), np.float32)
        count = np.zeros(alpha.shape, np.float32)

        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                shifted_good = np.zeros_like(good_u)
                shifted_rgb = np.zeros_like(rgb, dtype=np.float32)

                src_y = slice(max(0, dy), alpha.shape[0] + min(0, dy))
                dst_y = slice(max(0, -dy), alpha.shape[0] - max(0, dy))
                src_x = slice(max(0, dx), alpha.shape[1] + min(0, dx))
                dst_x = slice(max(0, -dx), alpha.shape[1] - max(0, dx))

                shifted_good[dst_y, dst_x] = good_u[src_y, src_x]
                shifted_rgb[dst_y, dst_x] = rgb[src_y, src_x]

                sum_rgb += shifted_rgb * shifted_good[:, :, None]
                count += shifted_good

        fill = working_spill & (count > 0)
        if np.any(fill):
            out[:, :, :3][fill] = (sum_rgb[fill] / count[fill, None]).astype(np.uint8)
            good[fill] = True
            working_spill[fill] = False
        if not np.any(working_spill):
            break

    if np.any(working_spill):
        rr2 = out[:, :, 0].astype(np.int16)
        gg2 = out[:, :, 1].astype(np.int16)
        bb2 = out[:, :, 2].astype(np.int16)
        muted_green = np.minimum(gg2, ((rr2 + bb2) // 2) + 45)
        out[:, :, 1][working_spill] = muted_green[working_spill].astype(np.uint8)

    return out


def main() -> None:
    sheet_bgr = cv2.imread(str(SRC), cv2.IMREAD_COLOR)
    if sheet_bgr is None:
        raise SystemExit(f"Failed to read {SRC}")

    for stale_png in OUT_DIR.glob("*.png"):
        stale_png.unlink()

    # Key green background with tolerance (imagegen sheets often contain near-green edge noise).
    b = sheet_bgr[:, :, 0].astype(np.int16)
    g = sheet_bgr[:, :, 1].astype(np.int16)
    r = sheet_bgr[:, :, 2].astype(np.int16)
    # "Green enough": strong G, weak R/B, and G dominates.
    is_green = (g >= 200) & (r <= 110) & (b <= 110) & (g - r >= 90) & (g - b >= 90)
    non_green = (~is_green).astype(np.uint8)

    # Remove tiny bridges/noise so separate sprites don't connect.
    kernel = np.ones((3, 3), np.uint8)
    non_green = cv2.morphologyEx(non_green, cv2.MORPH_OPEN, kernel, iterations=1)
    # Restore original shape after opening.
    non_green = cv2.dilate(non_green, kernel, iterations=1)

    # Connected components over content mask.
    num, labels, stats, _centroids = cv2.connectedComponentsWithStats(non_green, connectivity=8)

    atoms: list[AtomMeta] = []
    atom_index = 0

    # stats: [x, y, w, h, area]
    for label in range(1, num):
        x, y, w, h, area = (int(v) for v in stats[label])
        if area < 80:
            continue

        crop = sheet_bgr[y : y + h, x : x + w].copy()
        # Build RGBA: green-ish => alpha 0; others => alpha 255.
        cb = crop[:, :, 0].astype(np.int16)
        cg = crop[:, :, 1].astype(np.int16)
        cr = crop[:, :, 2].astype(np.int16)
        is_green = (cg >= 200) & (cr <= 110) & (cb <= 110) & (cg - cr >= 90) & (cg - cb >= 90)
        alpha = np.where(is_green, 0, 255).astype(np.uint8)
        rgba = np.dstack([crop[:, :, 2], crop[:, :, 1], crop[:, :, 0], alpha])  # to RGBA

        rgba = remove_green_fringe(rgba)

        atom_id = ATOM_NAMES[atom_index] if atom_index < len(ATOM_NAMES) else f"cutout-{atom_index:04d}"
        out_file = f"{atom_id}.png"
        out_path = OUT_DIR / out_file
        cv2.imwrite(str(out_path), cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))

        atoms.append(AtomMeta(id=atom_id, file=out_file, sheet_bbox=(x, y, w, h), area=area))
        atom_index += 1

    atoms.sort(key=lambda a: (-a.area, a.id))
    # Pipeline-only metadata (optional); gameplay uses PNGs + placements.v1.json from the map editor format.
    (OUT_DIR / "atoms.pipeline.json").write_text(json.dumps([asdict(a) for a in atoms], ensure_ascii=False, indent=2) + "\n")

    print(f"Wrote {len(atoms)} atoms to {OUT_DIR} (plus atoms.pipeline.json)")


if __name__ == "__main__":
    main()
