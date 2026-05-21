---
name: blender-mcp-character
description: Generate and iterate editable low-poly character blockouts inside Blender through a Blender MCP server. Use when Codex needs to connect to Blender via MCP, create or revise a .blend character model, establish materials, collections, armature placeholders, export/check readiness, or automate Blender scene operations while preserving a human artist's manual editing loop.
---

# Blender MCP Character

## Core Rule

Use Blender as the source of truth. Drive creation and engineering checks through MCP, save editable `.blend` files, and avoid bypassing Blender by directly generating final runtime assets unless the user explicitly asks for export or game integration.

For detailed modeling heuristics from the Star Trip/Pico session, read [references/character-blockout.md](references/character-blockout.md).

## Workflow

1. Confirm the target phase:
   - **Blockout**: create or revise an editable `.blend`; do not write to game/runtime asset directories.
   - **Cleanup/check**: validate names, materials, mesh continuity, armature placeholders, and export settings.
   - **Export/import**: only after the user confirms manual Blender edits are done.

2. Connect to Blender MCP:
   - Prefer an exposed native `blender` MCP tool if available in the current session.
   - Otherwise use `scripts/call_blender_mcp.py` with `uvx blender-mcp` over stdio.
   - Set telemetry off when possible: `DISABLE_TELEMETRY=true`.
   - First run a read-only scene query or small harmless object test before substantial edits.

3. Generate or revise the model in Blender:
   - Create named collections, materials, mesh objects, and armature placeholders.
   - Save the `.blend` after every meaningful iteration.
   - For character limbs, prefer single continuous faceted meshes with multiple rings/bands over many separate blocks when tight connection matters.

4. Validate through Blender, not assumptions:
   - Query object names, types, vertex/face counts, material slots, transforms, and stale object remnants.
   - Check whether visual requirements are represented in geometry, materials, or texture notes as intended.
   - Return concise verification evidence to the user.

5. Preserve the manual art loop:
   - Treat MCP output as an editable first draft.
   - Do not over-optimize, triangulate, decimate, export, or integrate until the user confirms the Blender model is ready.

## MCP Script

Use the helper script when no native Blender MCP tool is exposed:

```bash
python3 ~/.codex/skills/blender-mcp-character/scripts/call_blender_mcp.py \
  --code-file /tmp/blender_task.py \
  --prompt "Create or inspect the character blockout."
```

The script sends JSON-RPC `initialize`, `notifications/initialized`, and `tools/call` messages to `uvx blender-mcp`. It prints the MCP response as JSON.

For quick inline checks:

```bash
printf 'import bpy\nprint([o.name for o in bpy.context.scene.objects])\n' | \
python3 ~/.codex/skills/blender-mcp-character/scripts/call_blender_mcp.py \
  --prompt "List Blender scene objects."
```

## Safety

- Do not write into project runtime asset folders during blockout unless the user asks.
- Do not delete user-created Blender objects unless they match the current iteration's known prefixes or the user asks for a full redesign.
- Save a backup before destructive redesigns.
- Keep third-party MCP telemetry disabled or limited.
- Be cautious with arbitrary Python execution; restrict code to the active Blender scene and intended output paths.
