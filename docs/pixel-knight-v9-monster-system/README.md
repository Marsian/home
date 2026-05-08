# Pixel Knight V9 Monster System

Monster resource, gallery, and preview baseline for the first monster pass.

## Core Outputs

- `src/game-center/pixel-knight/monsters/`
  - Game-root monster directory. Each monster owns a folder and a generic `monster.meta.json`.
- `src/game-center/pixel-knight/monsters/slime/`
  - First monster: `史莱姆`.
  - Keeps the green-screen source sheet in `source-green/`.
  - Keeps transparent animation frames in `frames/{idle,walk,attack,attacked}/`.
- `scripts/pixel-knight/slice-monster-spritesheet.mjs`
  - Reusable chroma-key slicing pipeline for monster spritesheets.
  - Normalizes green-screen background, removes green spill/noise, writes transparent PNG frames, and updates metadata.
- `.cursor/skills/pixel-knight-monster-pipeline/SKILL.md`
  - Project skill that documents the full monster creation workflow.

## Runtime Integration

- `/games/pixel-knight/monsters`
  - Level 1 monster gallery.
  - Shows all monsters discovered from `monster.meta.json`.
  - Each card includes the monster name and an `idle` canvas preview.
- `/games/pixel-knight/monsters/:monsterId`
  - Level 2 monster detail page.
  - Supports animation state switching, play/pause, and left/right facing.
- `src/game-center/pixel-knight/rendering/monsterRenderer.ts`
  - Shared keyframe renderer.
  - Loads PNG frames from metadata and draws the current frame by state/time.
  - Mirrors facing direction in canvas instead of requiring duplicate left/right assets.

## Slime Animation Baseline

- Display name is `史莱姆`; do not call it `蓝色史莱姆` in UI or metadata.
- `idle`
  - 6 frames, looped, 120ms per frame.
  - Uses a stable base silhouette with subtle breathing only.
  - Avoid more frames for this state because generated frame drift makes the slime look misaligned.
- `walk`
  - 6 frames, looped, 110ms per frame.
- `attack`
  - 8 frames, non-looping, 90ms per frame.
  - Main lunge frames must stay fully inside the 256x256 frame.
- `attacked`
  - 4 frames, non-looping, 115ms per frame.
  - Intent is local hit reaction only: normal, squash, rebound, recover.
  - No knockback movement, walking pose, extra travel, or particle-heavy state should appear in this animation.

## Pipeline Decisions

- Monster folders live directly under Pixel Knight game root, not under `assets/`.
- Metadata uses the generic filename `monster.meta.json` so catalog pages can scan future monsters uniformly.
- Source spritesheets remain as green-screen PNGs; final game frames are transparent PNGs.
- Chroma-key cleanup is scripted instead of hand-edited:
  - key-color distance and green-dominance mask
  - green despill
  - small connected-component filtering
  - transparent-corner validation
  - green-fringe threshold validation
  - bbox edge-touch validation
- If imagegen produces unstable idle/attacked rows, derive those small states from one stable base frame with deterministic squash/stretch transforms.

## Verification

- `npm run build` passed after the v9 monster changes.
- Resource checks:
  - `idle`: 6 referenced frames, all present.
  - `walk`: 6 referenced frames, all present.
  - `attack`: 8 referenced frames, all present.
  - `attacked`: 4 referenced frames, all present.
  - Transparent frame corners are clear and green fringe checks pass on the revised idle/attacked frames.
- Browser checks performed during development:
  - Monster gallery renders the `史莱姆` card.
  - Detail route `/games/pixel-knight/monsters/slime` renders controls and action buttons.
  - Attack and attacked state switching works through the shared renderer.

## Follow-Up

- Add more monsters by following the project skill and the same `monster.meta.json` schema.
- Consider adding a small automated metadata validator once the second monster is added.
- Keep attacked animations short and semantic; reserve movement/knockback for combat logic, not the sprite state itself.
