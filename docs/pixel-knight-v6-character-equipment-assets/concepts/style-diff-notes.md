# Pixel Knight V6 Character and Equipment Style Notes

Date: 2026-04-30

## Reference Inputs

- `docs/pixel-knight-design-baseline-v2/concepts/character-select-home-clean-v1.png`
- `src/game-center/pixel-knight/assets/ui/character-select-bg-clean.png`
- `src/game-center/pixel-knight/assets/village/sliced/_contact-sheet.png`
- Current rendered character-select page and character demo screenshots

## Current Gap

The environment assets now read as bright cozy fantasy ARPG pixel art: clustered grass detail, soft warm daylight, hand-built wood and stone, and dark brown outlines that keep the forms readable without becoming heavy.

The current character and equipment are more matrix-like and lower-detail. The forms rely on larger block clusters, thicker near-black outlines, harder material highlights, and stronger isolated colors such as red shield panels and bright white armor plates. This makes the actor feel separate from the village and character-select background.

## V6 Direction

- Keep the readable chibi knight silhouette from the character-select baseline.
- Match the character-select reference complexity instead of producing a detailed pixel illustration.
- Use simple blocky forms, low pixel density, and a small color count per material.
- Use dot eyes and a short horizontal mouth, like the reference character.
- Prefer dark brown outlines over pure black.
- Keep metal highlights controlled and sparse; avoid broad white armor patches.
- Avoid rich texture, high-resolution pixel clusters, ornate plates, realistic rendering, or tiny decorative details.
- Use natural world colors for the low-tier set and refined blue-silver/gold contrast for the high-tier set.

## Set Tiers

- `meadow-guard`: low-tier village guard kit with bronze, leather, linen, wood, and meadow green accents.
- `starlit-vanguard`: higher-tier royal/elite knight kit with blue steel, cool silver, restrained gold trim, and small star-crystal accents.
