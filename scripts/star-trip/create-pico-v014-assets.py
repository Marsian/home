#!/usr/bin/env python3
"""Create Star Trip Pico v0.1.4 proportion assets from the v0.1.2 Blender source.

Run through Blender MCP or Blender:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/star-trip/create-pico-v014-assets.py
"""

from __future__ import annotations

import json
import math
import runpy
import shutil
from pathlib import Path

import bpy
from mathutils import Vector


REPO = Path(__file__).resolve().parents[2]
ASSET_DIR = REPO / "src/game-center/star-trip/assets/models/characters/pico"
OUTPUT_DIR = REPO / "output/star-trip"
SOURCE_BLEND = ASSET_DIR / "pico-v0.1.2-detail.blend"
SOURCE_SCRIPT = REPO / "scripts/star-trip/create-pico-v012-assets.py"
BACKUP_BLEND = OUTPUT_DIR / "pico-v0.1.2-detail-before-v014-proportions.blend"
TARGET_BLEND = ASSET_DIR / "pico-v0.1.4-proportions.blend"
TARGET_GLB = ASSET_DIR / "pico-v0.1.4-proportions.glb"
TARGET_CHECK = ASSET_DIR / "pico-v0.1.4-proportions.check.json"
CONTACT_SHEET = OUTPUT_DIR / "pico-v0.1.4-blender-contact-sheet.png"

TORSO_SCALE_Z = 0.86
LEG_SCALE_Z = 1.23
LEG_OUTWARD_X_OFFSET = 0.035
LEG_TORSO_OVERLAP = 0.035
TAIL_ROOT_LIFT = 0.095
TAIL_BACK_EMBED = 0.01

CORE_OBJECTS = {
    "torso": "Pico_Torso_tall_head_connected_blue_lowpoly",
    "hem": "Pico_Torso_light_blue_bottom_band",
    "left_leg": "Pico_LegFoot_L_whole_faceted_5bands",
    "right_leg": "Pico_LegFoot_R_whole_faceted_5bands",
    "tail": "Pico_Tail_Upturned_3feather",
    "head": "Pico_Head_faceted_large_reference_ratio",
}

REQUIRED_OBJECTS = [
    "Pico_Jetpack_Main_shell_lowpoly",
    "Pico_Jetpack_Nozzle_L",
    "Pico_Jetpack_Nozzle_R",
    "Pico_Tail_Upturned_3feather",
    "Pico_Crest_Back_Tuft_01",
    "Pico_Crest_Back_Tuft_02",
    "Pico_Crest_Back_Tuft_03",
    "Pico_Torso_tall_head_connected_blue_lowpoly",
    "Pico_LegFoot_L_whole_faceted_5bands",
    "Pico_LegFoot_R_whole_faceted_5bands",
]


def require_object(name: str) -> bpy.types.Object:
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Missing required Pico object: {name}")
    return obj


def bounds(obj: bpy.types.Object) -> dict[str, list[float]]:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mins = [min(c[i] for c in corners) for i in range(3)]
    maxs = [max(c[i] for c in corners) for i in range(3)]
    return {
        "min": [round(value, 4) for value in mins],
        "max": [round(value, 4) for value in maxs],
        "dimensions": [round(maxs[i] - mins[i], 4) for i in range(3)],
    }


def z_min_max(obj: bpy.types.Object) -> tuple[float, float]:
    entry = bounds(obj)
    return entry["min"][2], entry["max"][2]


def remap_mesh_z(obj: bpy.types.Object, target_min: float, target_max: float) -> None:
    if obj.type != "MESH":
        raise RuntimeError(f"{obj.name} is not a mesh")
    source_min, source_max = z_min_max(obj)
    source_height = source_max - source_min
    if source_height <= 0:
        raise RuntimeError(f"{obj.name} has invalid z bounds")
    inverse = obj.matrix_world.inverted()
    for vertex in obj.data.vertices:
        world = obj.matrix_world @ vertex.co
        t = (world.z - source_min) / source_height
        world.z = target_min + t * (target_max - target_min)
        vertex.co = inverse @ world
    obj.data.update()


def translate_mesh(obj: bpy.types.Object, delta: Vector) -> None:
    if obj.type != "MESH":
        raise RuntimeError(f"{obj.name} is not a mesh")
    inverse = obj.matrix_world.inverted()
    for vertex in obj.data.vertices:
        vertex.co = inverse @ ((obj.matrix_world @ vertex.co) + delta)
    obj.data.update()


def update_armature(
    new_torso_min: float,
    new_torso_max: float,
    leg_min: float,
    leg_max: float,
    left_leg_center_x: float,
    right_leg_center_x: float,
) -> None:
    armature = next((obj for obj in bpy.context.scene.objects if obj.name.startswith("Pico_Armature_Placeholder_")), None)
    if armature is None or armature.type != "ARMATURE":
        return

    with bpy.context.temp_override(active_object=armature, object=armature, selected_objects=[armature]):
        active = bpy.context.view_layer.objects.active
        if active is not None and active.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.select_all(action="DESELECT")
        armature.select_set(True)
        bpy.context.view_layer.objects.active = armature
        bpy.ops.object.mode_set(mode="EDIT")

        bones = armature.data.edit_bones
        if "Body" in bones:
            bones["Body"].head = (0, 0, new_torso_min)
            bones["Body"].tail = (0, 0, new_torso_max)
        for side, x in (("L", left_leg_center_x), ("R", right_leg_center_x)):
            leg_name = f"Leg_{side}"
            foot_name = f"Foot_{side}"
            knee_z = leg_min + (leg_max - leg_min) * 0.36
            if leg_name in bones:
                bones[leg_name].head = (x, 0.0, leg_max)
                bones[leg_name].tail = (x, -0.035, knee_z)
            if foot_name in bones:
                bones[foot_name].head = (x, -0.035, knee_z)
                bones[foot_name].tail = (x, -0.13, leg_min)

        bpy.ops.object.mode_set(mode="OBJECT")
    armature["design_note"] = "v0.1.4 placeholder bones realigned to shorter torso, longer legs, and wider hip stance."


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - Vector(obj.location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def create_v014_contact_sheet(render_paths: list[Path]) -> None:
    try:
        from PIL import Image, ImageDraw

        labels = ["front", "side", "back"]
        images = [Image.open(path).convert("RGB") for path in render_paths]
        sheet = Image.new("RGB", (1536, 552), (10, 28, 34))
        draw = ImageDraw.Draw(sheet)
        for index, image in enumerate(images):
            sheet.paste(image, (index * 512, 0))
            draw.text((index * 512 + 20, 520), labels[index], fill=(245, 248, 240))
        sheet.save(CONTACT_SHEET)
    except Exception:
        legacy_helpers = runpy.run_path(str(SOURCE_SCRIPT))
        read_png_rgba = legacy_helpers["read_png_rgba"]
        write_png_rgba = legacy_helpers["write_png_rgba"]
        images = [read_png_rgba(path) for path in render_paths]
        width = sum(image[0] for image in images)
        height = max(image[1] for image in images)
        canvas = bytearray([10, 28, 34, 255] * width * height)
        x_offset = 0
        for image_width, image_height, pixels in images:
            for y in range(image_height):
                dst = ((y * width) + x_offset) * 4
                src = y * image_width * 4
                canvas[dst : dst + image_width * 4] = pixels[src : src + image_width * 4]
            x_offset += image_width
        write_png_rgba(CONTACT_SHEET, width, height, canvas)


def render_contact_sheet() -> list[Path]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.film_transparent = False
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.color = (0.04, 0.11, 0.14)

    light = bpy.data.objects.get("Pico_Reference_Key_Light")
    if light is None:
        light = bpy.data.objects.new("Pico_Reference_Key_Light", bpy.data.lights.new("Pico_Reference_Key_Light", "AREA"))
        bpy.context.collection.objects.link(light)
    light.location = (0, -4.5, 4.5)
    light.data.energy = 450
    if hasattr(light.data, "size"):
        light.data.size = 4

    camera = bpy.data.objects.get("Pico_Reference_Inspection_Camera")
    if camera is None:
        camera = bpy.data.objects.new(
            "Pico_Reference_Inspection_Camera",
            bpy.data.cameras.new("Pico_Reference_Inspection_Camera"),
        )
        bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.data.lens = 65
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.35

    render_paths: list[Path] = []
    for label, location in [("front", (0, -4.3, 1.25)), ("side", (4.2, 0.1, 1.25)), ("back", (0, 4.3, 1.25))]:
        camera.location = location
        look_at(camera, (0, 0.12, 1.15))
        path = OUTPUT_DIR / f"pico-v0.1.4-blender-{label}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        render_paths.append(path)
    create_v014_contact_sheet(render_paths)
    return render_paths


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if SOURCE_BLEND.exists() and not BACKUP_BLEND.exists():
        shutil.copy2(SOURCE_BLEND, BACKUP_BLEND)

    bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))
    before = {key: bounds(require_object(name)) for key, name in CORE_OBJECTS.items()}

    torso = require_object(CORE_OBJECTS["torso"])
    hem = require_object(CORE_OBJECTS["hem"])
    left_leg = require_object(CORE_OBJECTS["left_leg"])
    right_leg = require_object(CORE_OBJECTS["right_leg"])
    tail = require_object(CORE_OBJECTS["tail"])

    old_torso_min, old_torso_max = z_min_max(torso)
    old_torso_height = old_torso_max - old_torso_min
    new_torso_max = old_torso_max
    new_torso_min = new_torso_max - old_torso_height * TORSO_SCALE_Z
    remap_mesh_z(torso, new_torso_min, new_torso_max)
    torso["design_note"] = "v0.1.4 torso shortened about 14% from the lower edge while preserving head connection."

    remap_mesh_z(hem, new_torso_min + 0.0025, new_torso_min + 0.0475)
    hem["design_note"] = "v0.1.4 hem moved to the shortened torso bottom edge."

    old_leg_min, old_leg_max = z_min_max(left_leg)
    old_leg_height = old_leg_max - old_leg_min
    new_leg_max = new_torso_min + LEG_TORSO_OVERLAP
    new_leg_min = new_leg_max - old_leg_height * LEG_SCALE_Z
    for leg in (left_leg, right_leg):
        remap_mesh_z(leg, new_leg_min, new_leg_max)
        leg["design_note"] = "v0.1.4 leg/foot lengthened about 23%, widened toward the hips, and overlapped into the shortened torso."

    translate_mesh(left_leg, Vector((-LEG_OUTWARD_X_OFFSET, 0, 0)))
    translate_mesh(right_leg, Vector((LEG_OUTWARD_X_OFFSET, 0, 0)))

    translate_mesh(tail, Vector((0, TAIL_BACK_EMBED, TAIL_ROOT_LIFT)))
    tail["design_note"] = "v0.1.4 tail root lifted and embedded into the new lower rear torso connection."

    left_leg_bounds = bounds(left_leg)
    right_leg_bounds = bounds(right_leg)
    left_leg_center_x = (left_leg_bounds["min"][0] + left_leg_bounds["max"][0]) / 2
    right_leg_center_x = (right_leg_bounds["min"][0] + right_leg_bounds["max"][0]) / 2
    update_armature(new_torso_min, new_torso_max, new_leg_min, new_leg_max, left_leg_center_x, right_leg_center_x)
    bpy.ops.wm.save_as_mainfile(filepath=str(TARGET_BLEND))

    bpy.ops.object.select_all(action="DESELECT")
    export_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith("Pico_") and obj.type in {"MESH", "ARMATURE"}]
    for obj in export_objects:
        obj.select_set(True)
    if export_objects:
        bpy.context.view_layer.objects.active = export_objects[0]
        with bpy.context.temp_override(active_object=export_objects[0], object=export_objects[0], selected_objects=export_objects):
            bpy.ops.export_scene.gltf(filepath=str(TARGET_GLB), export_format="GLB", use_selection=True, export_apply=True, export_yup=True)

    render_paths = render_contact_sheet()
    after = {key: bounds(require_object(name)) for key, name in CORE_OBJECTS.items()}
    torso_height_before = before["torso"]["dimensions"][2]
    torso_height_after = after["torso"]["dimensions"][2]
    leg_height_before = before["left_leg"]["dimensions"][2]
    leg_height_after = after["left_leg"]["dimensions"][2]
    torso_min = after["torso"]["min"][2]
    left_leg_max = after["left_leg"]["max"][2]
    right_leg_max = after["right_leg"]["max"][2]
    leg_gap_before = before["right_leg"]["min"][0] - before["left_leg"]["max"][0]
    leg_gap_after = after["right_leg"]["min"][0] - after["left_leg"]["max"][0]
    left_leg_center_after = (after["left_leg"]["min"][0] + after["left_leg"]["max"][0]) / 2
    right_leg_center_after = (after["right_leg"]["min"][0] + after["right_leg"]["max"][0]) / 2
    tail_max_z = after["tail"]["max"][2]
    tail_min_y = after["tail"]["min"][1]
    torso_back_y = after["torso"]["max"][1]
    stale_prefixes = ["Prototype_", "Debug_", "Temp_"]
    stale = [obj.name for obj in bpy.context.scene.objects if any(obj.name.startswith(prefix) for prefix in stale_prefixes)]

    objects = []
    for obj in sorted(export_objects, key=lambda item: item.name):
        entry = {
            "name": obj.name,
            "type": obj.type,
            "location": [round(value, 4) for value in obj.location],
            "dimensions": [round(value, 4) for value in obj.dimensions],
            "materials": [material.name for material in getattr(obj.data, "materials", [])],
        }
        if obj.type == "MESH":
            entry["vertices"] = len(obj.data.vertices)
            entry["faces"] = len(obj.data.polygons)
        if obj.type == "ARMATURE":
            entry["bones"] = [bone.name for bone in obj.data.bones]
        objects.append(entry)

    report = {
        "asset_dir": str(ASSET_DIR),
        "source_blend": str(SOURCE_BLEND),
        "backup_blend": str(BACKUP_BLEND),
        "blend": str(TARGET_BLEND),
        "glb": str(TARGET_GLB),
        "export_scope": "Selected objects whose names start with Pico_ and type is MESH or ARMATURE.",
        "object_count": len(export_objects),
        "mesh_count": sum(1 for obj in export_objects if obj.type == "MESH"),
        "armature_count": sum(1 for obj in export_objects if obj.type == "ARMATURE"),
        "required_objects": {name: bpy.data.objects.get(name) is not None for name in REQUIRED_OBJECTS},
        "stale_objects": stale,
        "proportion_changes": {
            "torso_height_before": round(torso_height_before, 4),
            "torso_height_after": round(torso_height_after, 4),
            "torso_height_delta_percent": round((torso_height_after / torso_height_before - 1) * 100, 2),
            "leg_height_before": round(leg_height_before, 4),
            "leg_height_after": round(leg_height_after, 4),
            "leg_height_delta_percent": round((leg_height_after / leg_height_before - 1) * 100, 2),
            "leg_gap_before": round(leg_gap_before, 4),
            "leg_gap_after": round(leg_gap_after, 4),
            "leg_gap_delta": round(leg_gap_after - leg_gap_before, 4),
            "left_leg_center_x_after": round(left_leg_center_after, 4),
            "right_leg_center_x_after": round(right_leg_center_after, 4),
            "leg_torso_overlap_left": round(left_leg_max - torso_min, 4),
            "leg_torso_overlap_right": round(right_leg_max - torso_min, 4),
            "tail_reaches_lower_torso": tail_max_z >= torso_min,
            "tail_embedded_in_rear_torso": tail_min_y <= torso_back_y,
        },
        "bounds_before": before,
        "bounds_after": after,
        "objects": objects,
        "visual_artifacts": {
            "contact_sheet": str(CONTACT_SHEET),
            "front": str(render_paths[0]),
            "side": str(render_paths[1]),
            "back": str(render_paths[2]),
        },
        "notes": [
            "v0.1.4 shortens Pico torso about 14% and lengthens legs about 23%.",
            "Legs are shifted outward toward the hips while keeping leg tops overlapped into the shortened torso.",
            "Tail root is moved to the new lower rear torso.",
            "Core object names are preserved for runtime pivots and e2e checks.",
        ],
    }
    TARGET_CHECK.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"blend": str(TARGET_BLEND), "glb": str(TARGET_GLB), "check": str(TARGET_CHECK), "contact_sheet": str(CONTACT_SHEET)}, indent=2))


if __name__ == "__main__":
    main()
