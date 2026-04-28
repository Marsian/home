from pathlib import Path
from PIL import Image

SRC = Path("src/game-center/pixel-knight/assets/village/sliced")
OUT = Path("src/game-center/pixel-knight/assets/village/terrain")
OUT.mkdir(parents=True, exist_ok=True)


def load(name: str) -> Image.Image:
    return Image.open(SRC / f"{name}.png").convert("RGBA")


def save_resized(source_name: str, output_name: str, size: tuple[int, int]) -> None:
    source = load(source_name)
    patch = source.resize(size, Image.Resampling.NEAREST)
    patch.save(OUT / f"{output_name}.png")


PATCHES = [
    ("tile-grass-plain", "terrain-grass-field", (480, 480)),
    ("tile-dirt-plain", "terrain-dirt-field", (480, 480)),
    ("tile-dirt-straight", "terrain-brick-road-vertical", (240, 720)),
    ("tile-dirt-straight", "terrain-brick-road-horizontal", (720, 240)),
]


def main() -> None:
    for source_name, output_name, size in PATCHES:
        save_resized(source_name, output_name, size)


if __name__ == "__main__":
    main()
