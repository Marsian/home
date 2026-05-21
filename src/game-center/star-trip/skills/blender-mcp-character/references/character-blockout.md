# Character Blockout Guidance

## Lessons from the Pico Iteration

- Reference analysis matters before geometry. Identify body ratios, silhouette, eye placement, beak/mouth direction, limb thickness, and whether details should be mesh, material, or texture.
- For low-poly characters inspired by A Short Hike-like models, favor readable faceted forms: large simple head, simple torso, strong side-view silhouette, flat materials, and deliberate low-poly bands.
- Do not model every painted detail. Use material slots or texture notes for belly panels, clothing color blocks, badges, or soft shading when geometry would add noise.
- Remove construction artifacts before user review: guide rings, debug panels, unused lights/cameras, stale prototypes, and old limb versions.

## Geometry Decisions

Choose one of these patterns explicitly:

- **Independent block segments**: use only when visible separation is desired.
- **Tightly touching segments**: ensure shared boundaries or intentional overlap, then verify final bounding boxes. This is fragile.
- **Continuous faceted mesh**: prefer for arms, legs, tails, scarves, or anything that must look connected while retaining low-poly rings.

For continuous limbs:

- Build one mesh per limb side, not many cubes.
- Use 4-5 faces around the cross-section for blocky readability.
- Use 4-6 rings/bands along the length for editable deformation and faceted structure.
- Shape thickness per ring: thicker middle for wing-like arms, tapered tips, thicker feet or hands.
- For bent limbs, vary ring centers along the intended axis. If the user asks for a Y-axis arc, change Y coordinates, not X.
- Weld or share vertices where leg and foot meet if they must be one piece.

For torso:

- Avoid a straight cylinder unless requested.
- Use multiple vertical rings and enough radial sides to show curvature.
- Match reference proportions: torso should connect directly to the head when no neck is desired.
- Use scale changes across rings for top-narrow/bottom-wide or rounded forms.

For eyes and beak:

- Side eyes should be discs on the left/right sides of the head, not front-facing unless the reference says so.
- A bird beak should protrude along the face normal and read as pointed; avoid excessive lateral offset.
- Move the beak vertically by changing its center on the head, not by skewing its direction.

## Naming Pattern

Use stable names that future checks can search:

- Collection: `Character_<Name>_Blockout`
- Meshes: `Pico_Head`, `Pico_Torso`, `Pico_Wing_L_whole_faceted_5bands`, `Pico_LegFoot_R_whole_faceted_5bands`
- Materials: `Pico_Mat_Feather_Indigo`, `Pico_Mat_Beak_Yellow`, `Pico_Mat_Clothing_Blue`
- Armature placeholder: `Pico_Armature_Placeholder_<Iteration>`
- Bones: `Root`, `Body`, `Head`, `Wing_L_01`, `Wing_R_01`, `Leg_L`, `Foot_L`

## Iteration Pattern

1. Before editing, query current objects and save a backup if making destructive changes.
2. Remove only known generated prefixes from previous attempts.
3. Create or revise geometry with explicit design notes in object custom properties.
4. Save the `.blend`.
5. Run a verification query:
   - required object names exist
   - stale object prefixes are gone
   - expected mesh counts and material slots exist
   - armature placeholder exists when needed
   - no game/runtime directory was modified during blockout
6. Report what changed and what was verified.

## Blender Python Tips

- Use `mesh.from_pydata(verts, [], faces)` for deterministic low-poly meshes.
- Set `polygon.use_smooth = False` for faceted style.
- Use material `diffuse_color` for blockout; do not overbuild PBR.
- When building connected bands, create rings of vertices and connect adjacent rings with quad faces.
- For truly continuous leg+foot geometry, make the foot top share the leg bottom ring vertices.
- Store short intent notes in `obj["design_note"]` to help later automation.
