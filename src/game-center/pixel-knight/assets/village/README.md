# Pixel Knight Starter Village Assets

Source files:

- `starter-village-spritesheet.png`: original imagegen output for the starter village pass.
- `starter-village-spritesheet-alpha.png`: alpha-cleaned source. White, light gray, medium gray, dark neutral checkerboard pixels, and washed-out green edge fringe are removed.
- `sliced/*.png`: clean independent assets cropped from the alpha source.
- `sliced/_contact-sheet.png`: visual QA sheet for the sliced assets.

Sliced asset groups:

- `tile-*`: grass, dirt road, cliff edge, and plaza tiles.
- `landmark-*`: portal, shop, storage chest, blacksmith, notice board, lantern.
- `decor-*`: bushes, grass patches, pine, and signposts.

Generation prompt summary:

- Subject: cozy medieval fantasy starter village spritesheet.
- Included assets: grass, dirt roads, stone plaza, portal, shop stall, storage chest, blacksmith forge, notice board, lanterns, bushes, signposts.
- Style: crisp 2.5D top-down pixel art, warm handmade fantasy, 1px dark outline, no text, no characters, no commercial-game copying.

Maintenance:

Run `python3 scripts/slice-pixel-knight-village-assets.py` from the repo root after replacing the source spritesheet. The script rewrites the alpha source, exports cleaned alpha PNGs into `sliced/`, checks neutral and green edge noise, and regenerates the contact sheet.
