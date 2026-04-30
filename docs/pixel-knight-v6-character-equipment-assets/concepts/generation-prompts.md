# Pixel Knight V6 Generation Prompts

Model requested: `gpt-image-2`

Generation mode: built-in image generation with flat `#00ff00` chroma-key background, followed by local chroma-key removal.

Final selection note: `character-base-v6-green.png` uses the restored v2 character direction selected after review. It keeps the simple dot-eye / horizontal-mouth face while retaining enough helmet and armor detail for the character-select screen.

Shared constraints for every asset:

- Crisp fantasy pixel art.
- Matches bright cozy medieval village pixel assets.
- Low-detail game sprite style, similar complexity to the character-select reference.
- Looks like a 32x32 or 48x48 game sprite enlarged with nearest-neighbor scaling.
- Chunky readable shapes, low pixel density, limited colors, minimal texture, no anti-aliasing look.
- 1px dark brown outline, not pure black.
- Warm daylight, readable silhouette.
- Perfectly flat solid `#00ff00` chroma-key background.
- No shadows, no gradients, no texture, no floor plane, no text, no watermark.
- Do not use `#00ff00` anywhere in the subject.
- Avoid ornate details, high-resolution pixel illustration, dense dithering, rich material rendering, complex armor, realistic proportions, or expressive anime face.

## Character

Create a full-body simple chibi pixel knight character for an ARPG character-select screen, front-facing 3/4 stance, idle-ready pose, compact toy-like proportions, simple helmet or simple brown hair shape, small blue scarf or plain blue tabard, basic boots and gloves, readable face with two dot eyes and one short horizontal mouth. Keep the design modest and not ornate. It should look like a 32x32 or 48x48 game sprite enlarged with nearest-neighbor scaling, not a high-detail pixel illustration. Use chunky readable shapes, low pixel density, limited colors, minimal texture, and simple material blocks similar in complexity to the character-select reference. The asset must be centered with generous padding on a perfectly flat solid `#00ff00` chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Use crisp fantasy pixel art, 1px dark brown outline, not pure black, warm daylight, readable silhouette, no text, no watermark, no cast shadow, no contact shadow. Avoid ornate armor, complex helmet ridges, dense dithering, rich material rendering, complex facial features, anime eyes, nose, open mouth, realistic proportions, anti-aliased edges, and high-resolution pixel illustration.

## Meadow Guard Set

Low-tier `meadow-guard` equipment set for a cozy medieval pixel ARPG, six separate item icons shown as clean isolated assets: helmet, armor, main-hand sword, off-hand shield, amulet, ring. Bronze, leather, linen, carved wood, meadow green accents, practical village guard craftsmanship, consistent palette and outline. Keep each item simple and readable with chunky low-detail shapes, few colors, sparse highlights, and minimal texture. Each item should be centered and isolated with generous padding on a perfectly flat solid `#00ff00` chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Use crisp fantasy pixel art, 1px dark brown outline, not pure black, warm daylight, readable silhouette, no text, no watermark, no cast shadow, no contact shadow. Avoid ornate detail, dense texture, and high-resolution pixel illustration.

## Starlit Vanguard Set

High-tier `starlit-vanguard` equipment set for a cozy medieval pixel ARPG, six separate item icons shown as clean isolated assets: helmet, armor, main-hand sword, off-hand shield, amulet, ring. Cool silver, blue steel, restrained gold trim, tiny star-crystal accents, refined royal vanguard craftsmanship, stronger silhouette than the low-tier set but still grounded and not over-glowing. Keep each item simple and readable with chunky low-detail shapes, few colors, sparse highlights, and minimal texture; show higher tier through cleaner silhouettes and small accents, not through ornate detail. Each item should be centered and isolated with generous padding on a perfectly flat solid `#00ff00` chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation. Use crisp fantasy pixel art, 1px dark brown outline, not pure black, warm daylight, readable silhouette, no text, no watermark, no cast shadow, no contact shadow. Avoid ornate detail, dense texture, complex glowing effects, and high-resolution pixel illustration.

## Per-Item Prompts

Per-item prompts follow the same shared constraints, replacing the subject with the specific slot and tier.

Final generated assets:

- Character: `source-green/character-base-v6-green.png`
- T1 `meadow-guard`: `helmet`, `armor`, `main-hand`, `off-hand`, `amulet`, `ring`
- T2 `starlit-vanguard`: `helmet`, `armor`, `main-hand`, `off-hand`, `amulet`, `ring`

Post-processing:

- Green-screen sources were normalized by flood-filling only border-connected green background regions to pure `#00ff00`.
- Transparent PNGs were produced with the local chroma-key removal helper.
- Contact sheets were generated for both equipment sets and the full character/equipment review.
