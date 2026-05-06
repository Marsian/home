#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import cv2


ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "src/game-center/pixel-knight/assets/village/v7-front/full/starter-village-front-small-plaza-all-roads-connected.png"
DETECTIONS = ROOT / "src/game-center/pixel-knight/game/maps/starterVillageV7Detections.json"
OUT = ROOT / "docs/pixel-knight-v7-front-village-assets/concepts/aligned-option-c-small-plaza-all-roads-connected.detections.png"


def color_for(kind: str) -> tuple[int, int, int]:
    # BGR
    return {
        "building": (0, 170, 255),
        "plaza": (200, 200, 200),
        "portal": (255, 180, 0),
        "stash": (120, 220, 120),
        "notice-board": (255, 120, 220),
        "torch": (0, 120, 255),
        "pillar": (180, 180, 255),
    }.get(kind, (255, 255, 255))


def main() -> None:
    image = cv2.imread(str(IMG), cv2.IMREAD_COLOR)
    if image is None:
        raise SystemExit(f"Failed to read {IMG}")

    data = json.loads(DETECTIONS.read_text())
    objects = data.get("objects", [])
    if not isinstance(objects, list):
        raise SystemExit("detections.objects must be a list")

    # Draw semi-transparent overlay for readability.
    overlay = image.copy()

    for obj in objects:
        bbox = obj.get("bbox")
        if not (isinstance(bbox, list) and len(bbox) == 4):
            continue
        x, y, w, h = (int(v) for v in bbox)
        kind = str(obj.get("kind", "object"))
        oid = str(obj.get("id", "object"))
        color = color_for(kind)

        # Filled translucent rect.
        cv2.rectangle(overlay, (x, y), (x + w, y + h), color, thickness=-1)

    # Blend overlay.
    image = cv2.addWeighted(overlay, 0.18, image, 0.82, 0)

    for obj in objects:
        bbox = obj.get("bbox")
        if not (isinstance(bbox, list) and len(bbox) == 4):
            continue
        x, y, w, h = (int(v) for v in bbox)
        kind = str(obj.get("kind", "object"))
        oid = str(obj.get("id", "object"))
        color = color_for(kind)

        # Border + corner emphasis
        cv2.rectangle(image, (x, y), (x + w, y + h), color, thickness=2)
        cv2.rectangle(image, (x, y), (x + min(18, w), y + min(18, h)), color, thickness=-1)

        label = f"{kind}:{oid}"
        # Label background
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
        bx0, by0 = x, max(0, y - th - 8)
        bx1, by1 = x + tw + 8, y
        cv2.rectangle(image, (bx0, by0), (bx1, by1), (0, 0, 0), thickness=-1)
        cv2.putText(image, label, (x + 4, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT), image)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()

