#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from collections import deque
from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image


TILE = 16
MAP_SIZE = (2048, 1280)
DEFAULT_KEY_RGB = (0, 0, 255)


@dataclass(frozen=True)
class AtomMeta:
    id: str
    file: str
    sheet_bbox: tuple[int, int, int, int]
    area: int


def parse_pair(value: str) -> tuple[int, int]:
    left, right = value.lower().split("x", 1)
    return int(left), int(right)


def parse_color(value: str) -> tuple[int, int, int]:
    raw = value.strip().lstrip("#")
    if len(raw) != 6:
        raise argparse.ArgumentTypeError("Expected a hex color like #0000ff")
    return int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16)


def atom_id_for_index(index: int, atom_names: list[str]) -> str:
    if index < len(atom_names):
        return atom_names[index]
    return f"atom-{index + 1:03d}"


def load_atom_names(path: Path | None) -> list[str]:
    if path is None:
        return []
    raw = json.loads(path.read_text())
    if isinstance(raw, list):
        names = raw
    elif isinstance(raw, dict) and isinstance(raw.get("atoms"), list):
        names = [item.get("id") if isinstance(item, dict) else item for item in raw["atoms"]]
    elif isinstance(raw, dict) and isinstance(raw.get("names"), list):
        names = raw["names"]
    else:
        raise SystemExit("--atom-names must be a JSON array, {\"names\": [...]}, or {\"atoms\": [{\"id\": ...}]}.")
    result = [str(name).strip() for name in names if str(name).strip()]
    if len(set(result)) != len(result):
        raise SystemExit("--atom-names contains duplicate ids.")
    return result


def read_json_object(path: Path) -> dict:
    if not path.exists():
        return {}
    raw = json.loads(path.read_text())
    return raw if isinstance(raw, dict) else {}


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def is_key_pixel(pixel: tuple[int, int, int], key_rgb: tuple[int, int, int]) -> bool:
    r, g, b = pixel
    kr, kg, kb = key_rgb
    distance_sq = (r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2
    if distance_sq <= 24 * 24:
        return True
    if key_rgb == (0, 255, 0):
        return g >= 180 and r <= 110 and b <= 110
    if key_rgb == (0, 0, 255):
        return b >= 150 and r <= 110 and g <= 130
    if key_rgb == (255, 0, 255):
        return r >= 180 and b >= 180 and g <= 110
    return False


def sort_components_by_rows(components: list[tuple[int, int, int, int, int]], row_tolerance: int) -> list[tuple[int, int, int, int, int]]:
    rows: list[list[tuple[int, int, int, int, int]]] = []
    for component in sorted(components, key=lambda box: box[1] + box[3] / 2):
        center_y = component[1] + component[3] / 2
        for row in rows:
            row_center = sum(item[1] + item[3] / 2 for item in row) / len(row)
            if abs(center_y - row_center) <= row_tolerance:
                row.append(component)
                break
        else:
            rows.append([component])

    ordered: list[tuple[int, int, int, int, int]] = []
    for row in rows:
        ordered.extend(sorted(row, key=lambda box: box[0]))
    return ordered


def slice_atoms(
    sheet_path: Path,
    out_dir: Path,
    atom_names: list[str],
    key_rgb: tuple[int, int, int],
    min_area: int,
    min_width: int,
    min_height: int,
    row_tolerance: int,
) -> list[AtomMeta]:
    image = Image.open(sheet_path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    content = [[False for _ in range(width)] for _ in range(height)]
    for y in range(height):
        for x in range(width):
            content[y][x] = not is_key_pixel(pixels[x, y][:3], key_rgb)

    visited = [[False for _ in range(width)] for _ in range(height)]
    components: list[tuple[int, int, int, int, int]] = []
    for y in range(height):
        for x in range(width):
            if visited[y][x] or not content[y][x]:
                continue
            queue: deque[tuple[int, int]] = deque([(x, y)])
            visited[y][x] = True
            min_x = max_x = x
            min_y = max_y = y
            area = 0
            while queue:
                cx, cy = queue.popleft()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    if visited[ny][nx] or not content[ny][nx]:
                        continue
                    visited[ny][nx] = True
                    queue.append((nx, ny))
            box_w = max_x - min_x + 1
            box_h = max_y - min_y + 1
            if area < min_area or box_w < min_width or box_h < min_height:
                continue
            components.append((min_x, min_y, box_w, box_h, area))

    components = sort_components_by_rows(components, row_tolerance)
    if atom_names and len(components) != len(atom_names):
        raise SystemExit(
            f"Connected component count mismatch: found {len(components)} components after thresholds, "
            f"but {len(atom_names)} atom names were provided. Adjust --min-area/--min-width/--min-height."
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.png"):
        stale.unlink()

    atoms: list[AtomMeta] = []
    for index, (x, y, w, h, area) in enumerate(components):
        atom_id = atom_id_for_index(index, atom_names)
        crop = image.crop((x, y, x + w, y + h))
        data = []
        for pixel in crop.getdata():
            if is_key_pixel(pixel[:3], key_rgb):
                data.append((0, 0, 0, 0))
            else:
                data.append(pixel)
        crop.putdata(data)
        out_file = f"{atom_id}.png"
        crop.save(out_dir / out_file)
        atoms.append(AtomMeta(atom_id, out_file, (x, y, w, h), area))

    (out_dir / "atoms.pipeline.json").write_text(json.dumps([asdict(atom) for atom in atoms], ensure_ascii=False, indent=2) + "\n")
    return atoms


def carve_disc(grid: list[list[str]], cx: int, cy: int, rx: int, ry: int) -> None:
    for row in range(cy - ry, cy + ry + 1):
        for col in range(cx - rx, cx + rx + 1):
            if row <= 0 or col <= 0 or row >= len(grid) - 1 or col >= len(grid[0]) - 1:
                continue
            dx = (col - cx) / max(1, rx)
            dy = (row - cy) / max(1, ry)
            if dx * dx + dy * dy <= 1:
                grid[row][col] = "."


def carve_rect(grid: list[list[str]], x: int, y: int, w: int, h: int) -> None:
    for row in range(y, y + h):
        for col in range(x, x + w):
            if row <= 0 or col <= 0 or row >= len(grid) - 1 or col >= len(grid[0]) - 1:
                continue
            grid[row][col] = "."


def carve_path(grid: list[list[str]], points: list[tuple[int, int]], width: int) -> None:
    radius = max(2, width // 2)
    for index in range(1, len(points)):
        x0, y0 = points[index - 1]
        x1, y1 = points[index]
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for step in range(steps + 1):
            t = step / steps
            x = round(x0 + (x1 - x0) * t)
            y = round(y0 + (y1 - y0) * t)
            carve_disc(grid, x, y, radius, radius)


def build_combat_grid(cols: int, rows: int) -> tuple[list[str], tuple[int, int], tuple[int, int]]:
    grid = [["#" for _ in range(cols)] for _ in range(rows)]
    arenas = [
        (12, 66, 11, 8),
        (30, 56, 15, 10),
        (51, 66, 13, 8),
        (58, 43, 17, 11),
        (82, 55, 16, 10),
        (98, 36, 14, 9),
        (72, 22, 15, 9),
        (112, 13, 11, 7),
    ]
    for cx, cy, rx, ry in arenas:
        carve_disc(grid, cx, cy, rx, ry)
    for x, y, w, h in [
        (20, 28, 18, 12),
        (38, 18, 16, 10),
        (8, 45, 13, 9),
        (100, 63, 16, 8),
    ]:
        carve_rect(grid, x, y, w, h)

    carve_path(grid, [(12, 66), (30, 56), (58, 43), (82, 55), (98, 36), (112, 13)], 11)
    carve_path(grid, [(30, 56), (51, 66), (82, 55)], 10)
    carve_path(grid, [(58, 43), (72, 22), (98, 36)], 9)
    carve_path(grid, [(30, 56), (20, 28), (38, 18), (72, 22)], 8)
    carve_path(grid, [(8, 45), (30, 56)], 8)
    carve_path(grid, [(82, 55), (100, 63), (112, 13)], 7)

    start = (10, 70)
    portal = (114, 12)
    for cx, cy in (start, portal):
        carve_disc(grid, cx, cy, 4, 4)
    grid[start[1]][start[0]] = "S"
    grid[portal[1]][portal[0]] = "P"
    return ["".join(row) for row in grid], start, portal


def write_map_json(map_dir: Path, rows: list[str], size: tuple[int, int], start: tuple[int, int], portal: tuple[int, int], map_name: str | None) -> None:
    cols = len(rows[0])
    grid_rows = len(rows)
    blocked = [
        {"col": col, "row": row}
        for row, line in enumerate(rows)
        for col, value in enumerate(line)
        if value == "#"
    ]
    obstacles = read_json_object(map_dir / "obstacles16.v1.json")
    obstacles.update(
        {
            "tile": TILE,
            "cols": cols,
            "rows": grid_rows,
            "image": {"width": size[0], "height": size[1]},
            "blocked": blocked,
        }
    )
    write_json(map_dir / "obstacles16.v1.json", obstacles)

    placements_path = map_dir / "placements.v1.json"
    placements = read_json_object(placements_path)
    placements["image"] = {"width": size[0], "height": size[1]}
    placements.setdefault("placements", [])
    write_json(placements_path, placements)

    slug = map_dir.name
    meta = read_json_object(map_dir / "map.meta.json")
    meta.setdefault("id", slug)
    meta.setdefault("kind", "dungeon")
    meta.setdefault("dungeonId", slug)
    if map_name:
        meta.setdefault("name", map_name)
    else:
        meta.setdefault("name", slug)
    meta["start"] = {"x": start[0], "y": start[1]}
    meta["portal"] = {"x": portal[0], "y": portal[1]}
    meta.setdefault("monsterClusters", [])
    write_json(map_dir / "map.meta.json", meta)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--map-dir", required=True, type=Path)
    parser.add_argument("--source-sheet", type=Path, help="Blue-screen atom sheet generated from the final map as reference.")
    parser.add_argument("--atom-names", type=Path, help="Optional JSON array of atom ids matching connected components in row order.")
    parser.add_argument("--key-color", type=parse_color, default=DEFAULT_KEY_RGB)
    parser.add_argument("--min-area", type=int, default=5000)
    parser.add_argument("--min-width", type=int, default=40)
    parser.add_argument("--min-height", type=int, default=40)
    parser.add_argument("--row-tolerance", type=int, default=160)
    parser.add_argument(
        "--write-map-json",
        action="store_true",
        help="Bootstrap map.meta/placements/obstacles JSON. Do not use after manual editor work.",
    )
    parser.add_argument("--map-name", help="Default display name to use only when map.meta.json has no name.")
    parser.add_argument("--size", default="2048x1280")
    args = parser.parse_args()

    size = parse_pair(args.size)
    if size != MAP_SIZE:
        raise SystemExit("Pixel Knight V10 otherworld maps currently expect 2048x1280.")

    source_sheet = args.source_sheet
    if source_sheet is None:
        source_sheet = args.map_dir / "source-green" / f"{args.map_dir.name}-atoms-bluescreen.png"
    atom_names = load_atom_names(args.atom_names)
    atoms = slice_atoms(
        source_sheet,
        args.map_dir / "atoms",
        atom_names,
        args.key_color,
        args.min_area,
        args.min_width,
        args.min_height,
        args.row_tolerance,
    )
    if args.write_map_json:
        rows, start, portal = build_combat_grid(size[0] // TILE, size[1] // TILE)
        write_map_json(args.map_dir, rows, size, start, portal, args.map_name)
    if args.write_map_json:
        print(f"Wrote {len(atoms)} atoms and bootstrapped map JSON in {args.map_dir}")
    else:
        print(f"Wrote {len(atoms)} atoms to {args.map_dir / 'atoms'}")


if __name__ == "__main__":
    main()
