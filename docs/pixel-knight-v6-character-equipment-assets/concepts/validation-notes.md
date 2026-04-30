# Pixel Knight V6 Asset Validation Notes

Date: 2026-04-30

## Delivered Assets

- Base character: 1 green-screen source and 1 transparent PNG.
- `meadow-guard`: 6 green-screen equipment sources and 6 transparent PNGs.
- `starlit-vanguard`: 6 green-screen equipment sources and 6 transparent PNGs.
- Contact sheets:
  - `meadow-guard-contact-sheet.png`
  - `starlit-vanguard-contact-sheet.png`
  - `review-contact-sheet.png`

## Style Check

- Character uses the selected v2 direction: simple dot eyes, short horizontal mouth, readable chibi knight silhouette, and enough armor detail for the character-select page.
- `meadow-guard` reads as lower-tier village guard gear through bronze, leather, wood, and warm practical shapes.
- `starlit-vanguard` reads as higher-tier royal gear through blue steel, silver, gold trim, star-crystal accents, and stronger silhouettes.
- Both sets remain in the same cozy medieval pixel-art world and avoid the old disconnected red shield / harsh white armor palette.

## Technical Check

- All final transparent PNG files have alpha corners set to `0`.
- Green-screen source backgrounds were normalized to border-connected pure `#00ff00` before chroma-key removal.
- No game code, renderer code, catalog data, or matrix JSON was changed.
