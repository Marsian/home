# Pixel Knight v7 Starter Village Assets

This folder now keeps only the selected outputs for the v7 front-facing starter village pass.

## Core Outputs

- `concepts/aligned-option-c-small-plaza-all-roads-connected.png`
  - Main starter village baseline.
  - Use as the visual source for road layout, building placement, plaza props, and future gameplay integration.
- `cutouts/imagegen-green/starter-village-collision-elements-imagegen-green-sheet.png`
  - Imagegen-generated green-screen collision element sheet.
  - Uses a flat `#00ff00` background and contains independently arranged village objects for later slicing.

Project asset copies:

- `src/game-center/pixel-knight/assets/village/v7-front/full/starter-village-front-small-plaza-all-roads-connected.png`
- `src/game-center/pixel-knight/assets/village/v7-front/cutouts/imagegen-green/starter-village-collision-elements-imagegen-green-sheet.png`

## Integration Notes

- Treat the full village image as the current art baseline for this round.
- Treat the green-screen sheet as the source for collision-object extraction.
- Slice final object PNGs from the green-screen sheet only after selecting the exact objects needed in-game.
- Author collision as simple rectangles or multi-rectangles per object; do not infer collision from alpha contours.
- Keep the storage chest, notice board, teleport disk, buildings, fences, trees, rocks, torches, entrance pillars, barrels, crates, and flower boxes as candidate collision or interaction objects.
