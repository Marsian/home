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


@dataclass(frozen=True)
class AtomMeta:
    id: str
    file: str
    sheet_bbox: tuple[int, int, int, int]  # x,y,w,h in sheet pixels
    area: int


def main() -> None:
    sheet_bgr = cv2.imread(str(SRC), cv2.IMREAD_COLOR)
    if sheet_bgr is None:
        raise SystemExit(f"Failed to read {SRC}")

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

        # Decontaminate green fringe on opaque edges: shift near-green pixels towards neutral.
        # This is intentionally conservative to avoid recoloring actual foliage.
        rr = rgba[:, :, 0].astype(np.int16)
        gg = rgba[:, :, 1].astype(np.int16)
        bb = rgba[:, :, 2].astype(np.int16)
        aa = rgba[:, :, 3] > 0
        fringe = aa & (gg - rr >= 50) & (gg - bb >= 50) & (gg >= 140)
        if np.any(fringe):
            # Pull green channel down towards max(r,b) + small bias.
            target = np.maximum(rr, bb) + 10
            gg = np.where(fringe, np.minimum(gg, target), gg)
            rgba[:, :, 1] = gg.astype(np.uint8)

        atom_id = f"atom-{atom_index:04d}"
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

