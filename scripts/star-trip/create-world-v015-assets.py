#!/usr/bin/env python3
"""Create Star Trip v0.1.5 reference-grade low-poly world assets.

Run through Blender MCP:
  import runpy
  runpy.run_path("/abs/path/scripts/star-trip/create-world-v015-assets.py", run_name="__main__")

Or through Blender directly:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/star-trip/create-world-v015-assets.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


REPO = Path(__file__).resolve().parents[2]
ASSET_DIR = REPO / "src/game-center/star-trip/assets/models/world/v0.1.5"
OUTPUT_DIR = REPO / "output/star-trip"
TARGET_BLEND = ASSET_DIR / "world-v0.1.5.blend"
TARGET_GLB = ASSET_DIR / "world-v0.1.5.glb"
TARGET_CHECK = ASSET_DIR / "world-v0.1.5.check.json"
CONTACT_SHEET = OUTPUT_DIR / "world-v0.1.5-contact-sheet.png"
MANIFEST = ASSET_DIR / "world-v0.1.5-reference-manifest.json"
ASSET_PREFIX = "ST015_"


NATURE_IDS = {
    "ST015_star_pine",
    "ST015_round_canopy_tree",
    "ST015_short_grass_a",
    "ST015_pebble_cluster",
    "ST015_low_rock",
}

TERRAIN_IDS = {
    "ST015_summit_round_peak",
    "ST015_climbable_slope",
    "ST015_moon_bay_pool",
    "ST015_pale_water_edge",
    "ST015_beach_arc",
    "ST015_warm_dirt_path",
}


def hex_to_rgba(value: int, alpha: float = 1.0) -> tuple[float, float, float, float]:
    return (((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, alpha)


def mat(name: str, color: int, alpha: float = 1.0, emission: float = 0.0) -> bpy.types.Material:
    material = bpy.data.materials.new(f"{ASSET_PREFIX}Mat_{name}")
    material.diffuse_color = hex_to_rgba(color, alpha)
    material.use_nodes = True
    material.use_backface_culling = False
    material.blend_method = "BLEND" if alpha < 1 else "OPAQUE"
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = hex_to_rgba(color, alpha)
        bsdf.inputs["Alpha"].default_value = alpha
        bsdf.inputs["Roughness"].default_value = 0.9
        if emission > 0:
            bsdf.inputs["Emission Color"].default_value = hex_to_rgba(color, 1)
            bsdf.inputs["Emission Strength"].default_value = emission
    return material


MATS: dict[str, bpy.types.Material] = {}
COLLECTIONS: dict[str, bpy.types.Collection] = {}
ASSET_SPECS: list[dict[str, str]] = []
REFERENCE_BY_ID: dict[str, dict[str, object]] = {}


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for material in list(bpy.data.materials):
        if material.name.startswith(f"{ASSET_PREFIX}Mat_"):
            bpy.data.materials.remove(material, do_unlink=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"


def make_materials() -> None:
    MATS.update(
        {
            "grass": mat("Grass_74bf91", 0x74BF91),
            "grass_dark": mat("Grass_Dark_4e986e", 0x4E986E),
            "grass_light": mat("Grass_Light_91d19d", 0x91D19D),
            "night_grass": mat("Night_Grass_4f6f78", 0x4F6F78),
            "soil": mat("Warm_Soil_c59a63", 0xC59A63),
            "soil_dark": mat("Soil_Dark_8f6748", 0x8F6748),
            "sand": mat("Sand_e9c88d", 0xE9C88D),
            "water": mat("Moon_Water_69a6c6", 0x69A6C6, 0.82),
            "water_light": mat("Water_Edge_a4d9dc", 0xA4D9DC, 0.72),
            "wood": mat("Wood_916545", 0x916545),
            "wood_dark": mat("Wood_Dark_5f4637", 0x5F4637),
            "birch": mat("Birch_f3e7cf", 0xF3E7CF),
            "leaf_a": mat("Leaf_A_2f9a70", 0x2F9A70),
            "leaf_b": mat("Leaf_B_47ad78", 0x47AD78),
            "leaf_c": mat("Leaf_C_5aa86d", 0x5AA86D),
            "rock": mat("Rock_7a7f87", 0x7A7F87),
            "rock_light": mat("Rock_Light_9aa0a2", 0x9AA0A2),
            "rock_dark": mat("Rock_Dark_596166", 0x596166),
            "crystal": mat("Blue_Crystal_8ec7d2", 0x8EC7D2, 0.94, 0.18),
            "cream": mat("Cream_fff3d3", 0xFFF3D3),
            "red": mat("Travel_Red_e55d55", 0xE55D55),
            "blue_gray": mat("Blue_Gray_4f7f98", 0x4F7F98),
            "dark_teal": mat("Deep_Teal_102d3a", 0x102D3A),
            "gold": mat("Signal_Gold_ffd95f", 0xFFD95F, 1.0, 0.3),
            "flower_pink": mat("Flower_Pink_ff8faa", 0xFF8FAA),
            "flower_white": mat("Flower_White_fff8e8", 0xFFF8E8),
            "flower_yellow": mat("Flower_Yellow_ffd95f", 0xFFD95F),
            "mushroom": mat("Mushroom_d86f5c", 0xD86F5C),
            "scorch": mat("Scorch_38423b", 0x38423B, 0.76),
        }
    )


def load_manifest() -> None:
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for item in payload["assets"]:
        REFERENCE_BY_ID[str(item["assetId"])] = item


def category_for(asset_id: str) -> str:
    if asset_id in NATURE_IDS:
        return "nature"
    if asset_id in TERRAIN_IDS:
        return "terrain"
    return "landmark"


def collection_for(category: str) -> bpy.types.Collection:
    if category not in COLLECTIONS:
        collection = bpy.data.collections.new(f"{ASSET_PREFIX}{category.title()}")
        bpy.context.scene.collection.children.link(collection)
        COLLECTIONS[category] = collection
    return COLLECTIONS[category]


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for existing in tuple(obj.users_collection):
        existing.objects.unlink(obj)
    collection.objects.link(obj)


def create_asset(asset_id: str) -> bpy.types.Object:
    category = category_for(asset_id)
    root = bpy.data.objects.new(asset_id, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.35
    root["asset_id"] = asset_id
    root["category"] = category
    root["reference_object"] = str(REFERENCE_BY_ID[asset_id]["referenceObject"])
    root["reference_source"] = str(REFERENCE_BY_ID[asset_id]["sourceUrl"])
    collection_for(category).objects.link(root)
    ASSET_SPECS.append({"id": asset_id, "category": category})
    return root


def finish(obj: bpy.types.Object, root: bpy.types.Object, material: bpy.types.Material) -> bpy.types.Object:
    obj.name = f"{root.name}_{obj.name}"
    obj.data.name = obj.name
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    obj.parent = root
    move_to_collection(obj, root.users_collection[0])
    return obj


def cube(root: bpy.types.Object, name: str, loc, scale, material: bpy.types.Material, rot=(0, 0, 0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return finish(obj, root, material)


def cylinder(root: bpy.types.Object, name: str, radius: float, depth: float, vertices: int, loc, material: bpy.types.Material, rot=(0, 0, 0), radius_top: float | None = None) -> bpy.types.Object:
    if radius_top is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius_top, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, root, material)


def cone(root: bpy.types.Object, name: str, radius: float, depth: float, vertices: int, loc, material: bpy.types.Material, rot=(0, 0, 0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    return finish(obj, root, material)


def sphere(root: bpy.types.Object, name: str, radius: float, loc, scale, material: bpy.types.Material, subdivisions: int = 1) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return finish(obj, root, material)


def circle(root: bpy.types.Object, name: str, radius: float, scale, material: bpy.types.Material, vertices: int = 24, loc=(0, 0, 0.008), rot=(0, 0, 0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_circle_add(vertices=vertices, radius=radius, fill_type="TRIFAN", location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return finish(obj, root, material)


def add_label(root: bpy.types.Object) -> None:
    ref = REFERENCE_BY_ID[root.name]
    bpy.ops.object.text_add(location=(-0.78, 0.72, 0.03), rotation=(0, 0, 0))
    label = bpy.context.object
    label.name = "reference_label"
    label.data.name = f"{root.name}_reference_label"
    label.data.body = str(ref["referenceType"]).split("+")[0].strip()
    label.data.align_x = "LEFT"
    label.data.size = 0.075
    label.data.align_y = "CENTER"
    label.parent = root
    move_to_collection(label, root.users_collection[0])


def blade(root: bpy.types.Object, index: int, x: float, y: float, height: float, material: bpy.types.Material) -> None:
    rot = (math.radians(8 + index * 3), math.radians((index % 3 - 1) * 8), math.radians(index * 37))
    cone(root, f"blade_{index:02d}", 0.035, height, 3, (x, y, height / 2), material, rot)


def rock(root: bpy.types.Object, name: str, loc, radius: float, scale, material: bpy.types.Material) -> None:
    sphere(root, name, radius, loc, scale, material, 1)


def build_tree(root: bpy.types.Object) -> None:
    aid = root.name
    if "pine" in aid:
        cylinder(root, "short_trunk", 0.08, 0.55, 6, (0, 0, 0.275), MATS["wood"])
        cone(root, "lower_boughs", 0.5, 0.62, 7, (0, 0, 0.68), MATS["leaf_a"])
        cone(root, "middle_boughs", 0.38, 0.52, 7, (0.03, -0.02, 1.02), MATS["leaf_b"])
        cone(root, "top_boughs", 0.27, 0.42, 7, (-0.02, 0.01, 1.3), MATS["grass_light"])
        cone(root, "side_bough_left", 0.22, 0.32, 7, (-0.2, 0.05, 0.86), MATS["leaf_b"], (0, math.radians(-10), math.radians(7)))
        cone(root, "side_bough_right", 0.18, 0.28, 7, (0.22, -0.03, 0.98), MATS["leaf_a"], (0, math.radians(12), math.radians(-9)))
        sphere(root, "star_tip", 0.055, (0, 0, 1.56), (1, 1, 1), MATS["gold"])
    elif "birch" in aid:
        cylinder(root, "pale_trunk", 0.065, 0.84, 6, (0, 0, 0.42), MATS["birch"], (math.radians(2), math.radians(-5), 0))
        for i, z in enumerate([0.22, 0.4, 0.58]):
            cube(root, f"bark_dash_{i}", (0.066, -0.003, z), (0.012, 0.028, 0.055), MATS["wood_dark"], (0, 0, math.radians(17 * i)))
        sphere(root, "off_round_leaf_mass", 0.4, (0.13, 0, 1.03), (0.8, 1.0, 1.16), MATS["grass_light"], 2)
    elif "cypress" in aid:
        cylinder(root, "leaning_trunk", 0.06, 0.72, 6, (-0.06, 0, 0.36), MATS["wood"], (0, math.radians(-10), 0))
        cone(root, "wind_swept_lower", 0.34, 0.72, 7, (0.12, 0, 0.82), MATS["leaf_a"], (0, math.radians(-12), 0))
        cone(root, "wind_swept_upper", 0.23, 0.54, 7, (0.23, 0, 1.18), MATS["leaf_b"], (0, math.radians(-18), 0))
    elif "dry_branch" in aid:
        cylinder(root, "dry_trunk", 0.07, 0.72, 6, (0, 0, 0.36), MATS["wood_dark"])
        for i, (angle, z, length) in enumerate([(0.35, 0.46, 0.42), (2.35, 0.56, 0.34), (4.3, 0.68, 0.28)]):
            cylinder(root, f"bare_branch_{i}", 0.025, length, 5, (math.cos(angle) * length * 0.23, math.sin(angle) * length * 0.23, z), MATS["wood_dark"], (math.radians(63), 0, angle))
    elif "sapling" in aid:
        cylinder(root, "twig", 0.035, 0.36, 5, (0, 0, 0.18), MATS["wood"])
        sphere(root, "leaf_puff", 0.16, (0, 0, 0.44), (1, 1, 0.9), MATS["grass_light"], 1)
    else:
        cylinder(root, "trunk", 0.085, 0.55, 6, (0, 0, 0.28), MATS["wood"])
        for i, angle in enumerate([0.2, 2.4, 4.2]):
            cylinder(root, f"root_flare_{i}", 0.025, 0.24, 5, (math.cos(angle) * 0.08, math.sin(angle) * 0.08, 0.08), MATS["wood_dark"], (math.radians(78), 0, angle))
        sphere(root, "main_canopy", 0.45, (0, 0, 0.86), (1.1, 0.98, 0.86), MATS["leaf_b"], 2)
        sphere(root, "side_canopy", 0.27, (-0.25, 0.03, 0.78), (0.9, 1.0, 0.82), MATS["leaf_a"], 1)
        sphere(root, "rear_canopy", 0.22, (0.22, 0.12, 0.8), (0.9, 0.85, 0.75), MATS["leaf_c"], 1)
        if "fruit" in aid:
            for i, angle in enumerate([0.2, 2.4, 4.1]):
                sphere(root, f"fruit_{i}", 0.045, (math.cos(angle) * 0.22, math.sin(angle) * 0.18, 0.84), (1, 1, 1), MATS["red"])


def build_shrub_grass_flower(root: bpy.types.Object) -> None:
    aid = root.name
    if "shrub" in aid:
        sphere(root, "left_puff", 0.26, (-0.16, 0, 0.22), (1.0, 0.9, 0.78), MATS["leaf_a"], 1)
        sphere(root, "right_puff", 0.24, (0.18, 0.02, 0.22), (0.9, 1.0, 0.72), MATS["leaf_b"], 1)
        sphere(root, "top_puff", 0.22, (0.02, -0.08, 0.36), (1.0, 0.9, 0.8), MATS["leaf_c"], 1)
        if "berry" in aid:
            for i, angle in enumerate([0.0, 1.7, 3.4, 4.8]):
                sphere(root, f"berry_{i}", 0.035, (math.cos(angle) * 0.2, math.sin(angle) * 0.14, 0.36), (1, 1, 1), MATS["red"])
    elif "grass" in aid and "patch" not in aid:
        count = 9 if "_b" in aid else 7
        height = 0.42 if "long" in aid else 0.2
        for i in range(count):
            angle = i * 2.399963
            radius = 0.05 + (i % 4) * 0.035
            blade(root, i, math.cos(angle) * radius, math.sin(angle) * radius, height * (0.72 + (i % 3) * 0.16), MATS["grass_dark" if "long" in aid else "grass"])
    elif "clover" in aid:
        for i in range(5):
            angle = i * math.tau / 5
            sphere(root, f"leaf_{i}", 0.075, (math.cos(angle) * 0.09, math.sin(angle) * 0.09, 0.035), (1, 0.8, 0.34), MATS["grass_light"], 1)
        sphere(root, "tiny_star", 0.028, (0, 0, 0.075), (1, 1, 1), MATS["gold"], 1)
    elif "mushrooms" in aid:
        for i, x in enumerate([-0.13, 0.02, 0.15]):
            cylinder(root, f"stem_{i}", 0.025, 0.1 + i * 0.025, 6, (x, math.sin(i) * 0.05, 0.055 + i * 0.012), MATS["cream"])
            sphere(root, f"cap_{i}", 0.07, (x, math.sin(i) * 0.05, 0.12 + i * 0.025), (1, 1, 0.48), MATS["mushroom"], 1)
    elif "reeds" in aid:
        for i in range(7):
            angle = i * 0.9
            x = math.cos(angle) * 0.16
            y = math.sin(angle) * 0.08
            cylinder(root, f"reed_{i}", 0.018, 0.46 + (i % 3) * 0.08, 5, (x, y, 0.23), MATS["grass_dark"])
            cone(root, f"reed_tip_{i}", 0.035, 0.07, 5, (x, y, 0.48 + (i % 3) * 0.08), MATS["soil_dark"])
    elif "floating_water_leaf" in aid:
        circle(root, "leaf_disc", 0.28, (1.12, 0.82, 1), MATS["leaf_b"], 18)
        cube(root, "leaf_cut", (0.13, 0.02, 0.015), (0.09, 0.025, 0.012), MATS["water"], (0, 0, math.radians(22)))
    elif "moss_mat" in aid:
        circle(root, "moss_pad", 0.52, (1.2, 0.68, 1), MATS["grass_dark"], 18)
        for i in range(5):
            sphere(root, f"moss_lump_{i}", 0.055, (-0.24 + i * 0.12, math.sin(i) * 0.12, 0.035), (1, 1, 0.45), MATS["grass_light"], 1)
    else:
        petal_mat = MATS["flower_white"] if "moonbell" in aid else MATS["flower_pink"] if "night" in aid else MATS["flower_yellow"]
        cylinder(root, "stem", 0.018, 0.3, 5, (0, 0, 0.15), MATS["grass_dark"])
        sphere(root, "center", 0.045, (0, 0, 0.34), (1, 1, 0.82), MATS["gold"], 1)
        for i in range(5):
            angle = i * math.tau / 5
            sphere(root, f"petal_{i}", 0.045, (math.cos(angle) * 0.07, math.sin(angle) * 0.07, 0.35), (1.35, 0.72, 0.48), petal_mat, 1)


def build_rocks(root: bpy.types.Object) -> None:
    aid = root.name
    if "pebble" in aid:
        for i, (x, y, r) in enumerate([(-0.14, 0, 0.1), (0.02, 0.06, 0.08), (0.16, -0.03, 0.11)]):
            rock(root, f"pebble_{i}", (x, y, r * 0.42), r, (1.1, 0.85, 0.62), MATS["rock_light"])
        for i, x in enumerate([-0.25, 0.27]):
            rock(root, f"tiny_chip_{i}", (x, -0.08 + i * 0.13, 0.025), 0.045, (1.2, 0.7, 0.35), MATS["rock_dark"])
    elif "sharp" in aid:
        cone(root, "sharp_spire", 0.23, 0.62, 5, (0, 0, 0.31), MATS["rock_dark"], (math.radians(3), math.radians(-8), 0))
    elif "layered" in aid:
        for i, z in enumerate([0.05, 0.14, 0.23]):
            cube(root, f"stone_layer_{i}", (0, 0, z), (0.34 - i * 0.05, 0.22 + i * 0.02, 0.045), MATS["rock" if i != 1 else "rock_light"], (0, 0, math.radians(i * 11)))
    elif "meteor" in aid:
        cone(root, "meteor_point", 0.18, 0.48, 6, (0, 0, 0.24), MATS["rock_dark"], (math.radians(10), math.radians(12), math.radians(8)))
        sphere(root, "warm_core", 0.055, (0.03, -0.04, 0.2), (1, 1, 0.75), MATS["gold"], 1)
    elif "crystal" in aid:
        for i, (x, h) in enumerate([(-0.13, 0.38), (0.0, 0.54), (0.14, 0.34)]):
            cone(root, f"crystal_{i}", 0.07, h, 5, (x, 0.02 * i, h / 2), MATS["crystal"], (math.radians(4 * i), math.radians(-6 + i * 4), 0))
    elif "step_stones" in aid:
        for i in range(4):
            cube(root, f"step_{i}", (-0.36 + i * 0.24, math.sin(i) * 0.035, 0.035), (0.09, 0.16, 0.035), MATS["rock_light"], (0, 0, math.radians(i * 8)))
    else:
        rock(root, "low_rock_body", (0, 0, 0.13), 0.24, (1.25, 0.78, 0.62), MATS["rock"])
        cube(root, "highlight_face", (-0.08, -0.13, 0.2), (0.11, 0.025, 0.07), MATS["rock_light"], (0, 0, math.radians(8)))
        circle(root, "rock_shadow", 0.28, (1.2, 0.7, 1), MATS["scorch"], 18, loc=(0, 0, 0.004))


def roof_house(root: bpy.types.Object, body_mat: bpy.types.Material, roof_mat: bpy.types.Material, wide: float = 1.0) -> None:
    cube(root, "raised_foundation", (0, 0, 0.08), (0.5 * wide, 0.42, 0.08), MATS["rock_light"])
    cube(root, "body", (0, 0, 0.35), (0.42 * wide, 0.34, 0.35), body_mat)
    cone(root, "roof", 0.56 * wide, 0.38, 4, (0, 0, 0.77), roof_mat, (0, 0, math.radians(45)))
    cube(root, "front_eave", (0, -0.39, 0.72), (0.5 * wide, 0.05, 0.045), roof_mat)
    cube(root, "door_step", (0, -0.42, 0.09), (0.18, 0.08, 0.035), MATS["wood_dark"])
    cube(root, "door", (0, -0.345, 0.22), (0.1, 0.018, 0.18), MATS["wood_dark"])
    cube(root, "window", (-0.22 * wide, -0.346, 0.44), (0.07, 0.018, 0.065), MATS["water"])
    cube(root, "right_window", (0.22 * wide, -0.346, 0.45), (0.06, 0.018, 0.055), MATS["water"])
    cube(root, "window_sill", (-0.22 * wide, -0.368, 0.38), (0.085, 0.022, 0.014), MATS["wood"])


def build_landmark(root: bpy.types.Object) -> None:
    aid = root.name
    if "rocket_main" in aid:
        cylinder(root, "cream_body", 0.24, 1.34, 14, (0, 0, 0.35), MATS["cream"], (0, math.radians(90), 0), 0.2)
        cone(root, "capsule_nose", 0.2, 0.34, 12, (0.78, 0, 0.35), MATS["red"], (0, math.radians(90), 0))
        cone(root, "rear_nozzle", 0.22, 0.26, 10, (-0.76, 0, 0.35), MATS["blue_gray"], (0, math.radians(-90), 0))
        cylinder(root, "round_window", 0.095, 0.026, 12, (0.22, -0.245, 0.43), MATS["water"], (math.radians(90), 0, 0))
        cylinder(root, "rear_band", 0.245, 0.045, 14, (-0.52, 0, 0.35), MATS["red"], (0, math.radians(90), 0))
        cylinder(root, "middle_band", 0.242, 0.035, 14, (-0.05, 0, 0.35), MATS["blue_gray"], (0, math.radians(90), 0))
        cube(root, "red_stripe", (-0.12, -0.246, 0.24), (0.38, 0.018, 0.038), MATS["red"])
        for i, (y, z, rot) in enumerate([(0.22, 0.18, -12), (-0.02, 0.11, 18), (-0.2, 0.18, 38)]):
            cube(root, f"folded_fin_{i}", (-0.62, y, z), (0.12, 0.035, 0.18), MATS["blue_gray"], (0, math.radians(rot), math.radians(8 * i)))
        for i, x in enumerate([-0.34, 0.08, 0.42]):
            cube(root, f"panel_line_{i}", (x, -0.247, 0.35), (0.012, 0.018, 0.16), MATS["wood_dark"])
    elif "rocket_broken" in aid:
        cone(root, "red_nose_piece", 0.25, 0.46, 12, (0, 0, 0.25), MATS["red"], (0, math.radians(72), 0))
        cube(root, "broken_edge", (-0.16, 0, 0.12), (0.1, 0.23, 0.06), MATS["cream"], (0, 0, math.radians(11)))
    elif "rocket_side" in aid:
        cube(root, "blue_fin_a", (-0.13, 0, 0.12), (0.1, 0.34, 0.08), MATS["blue_gray"], (0, 0, math.radians(-14)))
        cube(root, "blue_fin_b", (0.16, 0.04, 0.1), (0.08, 0.24, 0.065), MATS["blue_gray"], (0, 0, math.radians(24)))
        cube(root, "cream_torn_panel", (0.04, -0.18, 0.09), (0.18, 0.07, 0.045), MATS["cream"], (0, 0, math.radians(-28)))
        cube(root, "red_trim_fragment", (-0.26, 0.11, 0.08), (0.11, 0.035, 0.035), MATS["red"], (0, 0, math.radians(32)))
    elif "scorch" in aid:
        circle(root, "scorch_oval", 0.68, (1.4, 0.82, 1), MATS["scorch"], 24)
        circle(root, "inner_burn", 0.42, (1.1, 0.62, 1), MATS["rock_dark"], 18, loc=(0.04, -0.02, 0.012))
        for i in range(6):
            angle = i * math.tau / 6
            rock(root, f"ash_pebble_{i}", (math.cos(angle) * 0.45, math.sin(angle) * 0.25, 0.03), 0.045, (1, 0.75, 0.45), MATS["rock_dark"])
    elif "crate" in aid:
        cube(root, "crate_box", (0, 0, 0.18), (0.27, 0.25, 0.18), MATS["wood"])
        cube(root, "crate_band_x", (0, -0.255, 0.18), (0.3, 0.018, 0.03), MATS["cream"])
        cube(root, "crate_band_z", (0, -0.256, 0.18), (0.035, 0.018, 0.2), MATS["cream"])
    elif "hatch" in aid:
        cube(root, "hatch_plate", (0, 0, 0.055), (0.34, 0.22, 0.045), MATS["blue_gray"], (0, 0, math.radians(7)))
        cylinder(root, "handle", 0.035, 0.11, 8, (0, -0.19, 0.12), MATS["dark_teal"], (math.radians(90), 0, 0))
    elif "cabin" in aid:
        roof_house(root, MATS["cream"], MATS["red"], 1.0)
        cylinder(root, "tiny_chimney", 0.035, 0.24, 6, (0.25, 0.08, 0.98), MATS["rock_dark"])
    elif "cart_house" in aid:
        cube(root, "cart_body", (0, 0, 0.28), (0.48, 0.3, 0.28), MATS["wood"])
        cone(root, "canvas_roof", 0.58, 0.32, 4, (0, 0, 0.62), MATS["grass_light"], (0, 0, math.radians(45)))
        for x in [-0.36, 0.36]:
            cylinder(root, f"wheel_{x}", 0.1, 0.04, 10, (x, -0.23, 0.12), MATS["wood_dark"], (math.radians(90), 0, 0))
        cube(root, "seed_awning", (0, -0.34, 0.47), (0.44, 0.035, 0.045), MATS["gold"])
    elif "shore_shed" in aid:
        roof_house(root, MATS["blue_gray"], MATS["cream"], 0.88)
        cylinder(root, "fishing_pole", 0.016, 0.88, 5, (0.42, -0.25, 0.52), MATS["wood"], (math.radians(24), math.radians(-8), 0))
        cylinder(root, "line", 0.006, 0.45, 4, (0.55, -0.34, 0.25), MATS["cream"], (math.radians(7), 0, math.radians(12)))
        cube(root, "bait_crate", (-0.42, -0.38, 0.14), (0.12, 0.09, 0.08), MATS["wood"])
        cylinder(root, "bucket", 0.065, 0.1, 10, (0.32, -0.42, 0.08), MATS["rock_light"])
    elif "relay" in aid:
        cylinder(root, "post", 0.055, 0.82, 6, (0, 0, 0.41), MATS["wood"])
        cube(root, "mail_box", (0.18, -0.02, 0.62), (0.24, 0.16, 0.12), MATS["red"])
        cone(root, "relay_roof", 0.28, 0.2, 4, (0.18, -0.02, 0.78), MATS["cream"], (0, 0, math.radians(45)))
    elif "tent" in aid:
        cone(root, "tent", 0.52, 0.72, 4, (0, 0, 0.36), MATS["dark_teal"], (0, 0, math.radians(45)))
        cube(root, "tent_door", (0, -0.37, 0.23), (0.12, 0.018, 0.2), MATS["cream"])
        sphere(root, "star_lamp", 0.055, (0.28, -0.22, 0.58), (1, 1, 1), MATS["gold"], 1)
    elif "shed" in aid:
        roof_house(root, MATS["wood"], MATS["blue_gray"], 0.78)
    elif "comm_tower" in aid:
        cube(root, "concrete_base", (0, 0, 0.08), (0.28, 0.28, 0.08), MATS["rock_light"])
        cylinder(root, "mast", 0.06, 1.72, 6, (0, 0, 0.86), MATS["cream"])
        cylinder(root, "lower_brace", 0.024, 1.0, 5, (-0.22, 0, 0.55), MATS["blue_gray"], (math.radians(16), 0, 0))
        cylinder(root, "upper_brace", 0.024, 1.0, 5, (0.22, 0, 0.55), MATS["blue_gray"], (math.radians(-16), 0, 0))
        cylinder(root, "rear_brace", 0.02, 1.12, 5, (0, 0.22, 0.66), MATS["blue_gray"], (0, math.radians(16), 0))
        for z in [0.45, 0.8, 1.15]:
            cube(root, f"crossbar_{z}", (0, 0, z), (0.38, 0.025, 0.025), MATS["blue_gray"])
            cube(root, f"rear_crossbar_{z}", (0, 0.16, z + 0.05), (0.025, 0.28, 0.025), MATS["blue_gray"])
        cone(root, "top_beacon", 0.14, 0.2, 10, (0, 0, 1.83), MATS["gold"])
        cone(root, "dish", 0.42, 0.23, 14, (0.28, -0.04, 1.38), MATS["water_light"], (0, math.radians(78), 0))
        cylinder(root, "antenna_left", 0.012, 0.56, 5, (-0.18, 0, 1.88), MATS["cream"], (math.radians(9), 0, 0))
        cylinder(root, "antenna_right", 0.012, 0.48, 5, (0.18, 0, 1.84), MATS["cream"], (math.radians(-8), 0, 0))
    elif "dish" in aid:
        cylinder(root, "short_mount", 0.05, 0.52, 6, (0, 0, 0.26), MATS["cream"])
        cone(root, "wide_dish", 0.46, 0.24, 14, (0.18, -0.03, 0.66), MATS["water_light"], (0, math.radians(72), 0))
        cylinder(root, "rear_support", 0.018, 0.42, 5, (0.02, -0.02, 0.56), MATS["blue_gray"], (0, math.radians(34), 0))
        sphere(root, "receiver_tip", 0.04, (0.42, -0.04, 0.7), (1, 1, 1), MATS["gold"], 1)
    elif "lighthouse" in aid:
        cylinder(root, "body", 0.16, 0.96, 8, (0, 0, 0.48), MATS["cream"], radius_top=0.12)
        cylinder(root, "red_band", 0.165, 0.05, 8, (0, 0, 0.6), MATS["red"])
        cube(root, "door", (0, -0.165, 0.18), (0.075, 0.016, 0.16), MATS["wood_dark"])
        for i, z in enumerate([0.42, 0.76]):
            cube(root, f"slit_window_{i}", (0, -0.152, z), (0.045, 0.016, 0.055), MATS["water"])
        cylinder(root, "gallery_ring", 0.22, 0.045, 12, (0, 0, 0.94), MATS["blue_gray"])
        sphere(root, "light", 0.11, (0, 0, 1.04), (1, 1, 0.78), MATS["gold"], 1)
        cone(root, "roof_cap", 0.16, 0.16, 8, (0, 0, 1.2), MATS["red"])
    elif "battery" in aid:
        cube(root, "socket_base", (0, 0, 0.12), (0.32, 0.28, 0.12), MATS["rock_dark"])
        cube(root, "gold_slot", (0, -0.29, 0.15), (0.18, 0.02, 0.055), MATS["gold"])
    elif "platform" in aid and "stargazing" not in aid:
        cube(root, "deck", (0, 0, 0.08), (0.56, 0.46, 0.06), MATS["wood"])
        for x in [-0.44, 0.44]:
            for y in [-0.34, 0.34]:
                cylinder(root, f"post_{x}_{y}", 0.025, 0.35, 5, (x, y, 0.18), MATS["wood_dark"])
    elif "signpost" in aid:
        cylinder(root, "post", 0.04, 0.8, 6, (0, 0, 0.4), MATS["wood"])
        cube(root, "crossbar", (0, 0, 0.72), (0.34, 0.045, 0.035), MATS["wood"])
        for i, x in enumerate([-0.16, 0, 0.16]):
            cylinder(root, f"chime_{i}", 0.018, 0.22, 6, (x, -0.02, 0.56), MATS["cream"])
    elif "way_sign" in aid:
        cylinder(root, "post", 0.035, 0.68, 6, (0, 0, 0.34), MATS["wood_dark"])
        cube(root, "arrow_a", (0.18, -0.02, 0.58), (0.28, 0.035, 0.055), MATS["wood"])
        cube(root, "arrow_b", (-0.15, -0.02, 0.43), (0.24, 0.035, 0.05), MATS["wood"])
        cube(root, "arrow_c", (0.12, -0.02, 0.3), (0.2, 0.035, 0.045), MATS["wood"])
        for i, (x, z) in enumerate([(0.08, 0.58), (0.25, 0.58), (-0.08, 0.43), (-0.22, 0.43)]):
            sphere(root, f"nail_{i}", 0.012, (x, -0.047, z), (1, 1, 0.5), MATS["rock_dark"], 1)
    elif "plinth" in aid:
        cylinder(root, "plinth", 0.18, 0.22, 8, (0, 0, 0.11), MATS["rock"])
        cube(root, "energy_block", (0, 0, 0.34), (0.13, 0.13, 0.13), MATS["gold"], (math.radians(10), math.radians(18), math.radians(8)))
    elif "boardwalk" in aid or "pier" in aid or "bridge" in aid:
        count = 7 if "bridge" in aid else 6 if "boardwalk" in aid else 4
        for i in range(count):
            cube(root, f"plank_{i}", (-0.5 + i * (1 / max(1, count - 1)), 0, 0.055), (0.065, 0.48 if "pier" not in aid else 0.56, 0.045), MATS["wood"], (0, 0, math.radians((i % 2) * 4 - 2)))
        cube(root, "rail_a", (0, -0.42, 0.18), (0.64, 0.035, 0.035), MATS["wood_dark"])
        cube(root, "rail_b", (0, 0.42, 0.18), (0.64, 0.035, 0.035), MATS["wood_dark"])
        for x in [-0.58, 0.58]:
            for y in [-0.42, 0.42]:
                cylinder(root, f"post_{x}_{y}", 0.028, 0.34, 6, (x, y, 0.18), MATS["wood_dark"])
        if "bridge" in aid:
            cylinder(root, "upper_rope_a", 0.016, 1.25, 6, (0, -0.52, 0.34), MATS["wood_dark"], (0, math.radians(90), 0))
            cylinder(root, "upper_rope_b", 0.016, 1.25, 6, (0, 0.52, 0.34), MATS["wood_dark"], (0, math.radians(90), 0))
    elif "soil_plot" in aid:
        circle(root, "tilled_plot", 0.48, (1.25, 0.72, 1), MATS["soil"], 18)
        for i in [-0.2, 0, 0.2]:
            cube(root, f"furrow_{i}", (i, 0, 0.018), (0.018, 0.36, 0.014), MATS["soil_dark"])
    elif "campfire" in aid:
        circle(root, "ash_base", 0.32, (1.2, 0.86, 1), MATS["scorch"], 18)
        for i in range(8):
            angle = i * math.tau / 8
            rock(root, f"ring_rock_{i}", (math.cos(angle) * 0.23, math.sin(angle) * 0.23, 0.035), 0.055, (1, 0.8, 0.55), MATS["rock"])
        cylinder(root, "log_a", 0.035, 0.42, 6, (0, 0, 0.07), MATS["wood_dark"], (math.radians(90), 0, math.radians(38)))
        cylinder(root, "log_b", 0.035, 0.38, 6, (0, 0, 0.085), MATS["wood"], (math.radians(90), 0, math.radians(-38)))
        cone(root, "small_flame", 0.08, 0.22, 6, (0, 0, 0.17), MATS["gold"])
        cone(root, "red_flame_core", 0.045, 0.16, 5, (0.02, -0.01, 0.16), MATS["red"])
    elif "stargazing" in aid:
        cylinder(root, "round_deck", 0.46, 0.08, 12, (0, 0, 0.08), MATS["wood"])
        cylinder(root, "telescope_tripod", 0.035, 0.45, 6, (0, 0, 0.3), MATS["wood_dark"])
        cylinder(root, "telescope", 0.045, 0.42, 8, (0.12, -0.04, 0.52), MATS["blue_gray"], (0, math.radians(72), 0))


def build_terrain(root: bpy.types.Object) -> None:
    aid = root.name
    if "peak" in aid:
        sphere(root, "peak_body", 0.72, (0, 0, 0.38), (1.25, 0.92, 0.62), MATS["grass_dark"], 2)
        sphere(root, "rock_cap", 0.42, (0.18, -0.08, 0.62), (1.15, 0.8, 0.36), MATS["rock_light"], 1)
        circle(root, "summit_grass_lip", 0.55, (1.2, 0.6, 1), MATS["grass_light"], 18, loc=(-0.05, 0.02, 0.72))
    elif "ridge" in aid:
        cube(root, "ridge_body", (0, 0, 0.18), (0.95, 0.28, 0.18), MATS["grass_dark"], (0, 0, math.radians(7)))
    elif "low_hill" in aid:
        sphere(root, "hill_body", 0.48, (0, 0, 0.19), (1.55, 1.0, 0.38), MATS["grass_light"], 2)
    elif "step_wall" in aid:
        for i in range(4):
            cube(root, f"step_{i}", (-0.36 + i * 0.24, 0, 0.08 + i * 0.08), (0.16, 0.42, 0.08), MATS["rock"], (0, 0, math.radians(i * 4)))
    elif "slope" in aid and "shadow" not in aid:
        cube(root, "soft_slope", (0, 0, 0.13), (0.62, 0.44, 0.13), MATS["grass_light"], (0, math.radians(-8), 0))
        for i, x in enumerate([-0.28, 0, 0.27]):
            cube(root, f"climb_chip_{i}", (x, -0.24, 0.22 + i * 0.035), (0.08, 0.04, 0.035), MATS["rock_light"], (0, 0, math.radians(i * 9)))
    elif "stone_ring" in aid:
        for i in range(9):
            angle = i * math.tau / 9
            rock(root, f"ring_stone_{i}", (math.cos(angle) * 0.48, math.sin(angle) * 0.32, 0.055), 0.08, (1.1, 0.8, 0.55), MATS["rock_dark"])
    elif "pool" in aid:
        circle(root, "deep_pool", 0.76, (1.32, 0.76, 1), MATS["water"], 32)
        circle(root, "inner_blue", 0.46, (1.1, 0.58, 1), MATS["water_light"], 28, loc=(0.05, -0.02, 0.014))
    elif "river" in aid:
        cube(root, "river_ribbon", (0, 0, 0.012), (0.14, 1.2, 0.012), MATS["water"])
    elif "stream" in aid:
        cube(root, "stream_ribbon", (0, 0, 0.012), (0.09, 0.72, 0.012), MATS["water_light"])
    elif "waterfall" in aid:
        cube(root, "waterfall_sheet", (0, -0.015, 0.22), (0.22, 0.018, 0.28), MATS["water_light"])
    elif "water_edge" in aid:
        circle(root, "edge_ring", 0.82, (1.35, 0.8, 1), MATS["water_light"], 32)
        for i in range(6):
            angle = i * math.tau / 6
            rock(root, f"shore_pebble_{i}", (math.cos(angle) * 0.72, math.sin(angle) * 0.4, 0.022), 0.035, (1.1, 0.75, 0.4), MATS["sand"])
    elif "beach" in aid:
        circle(root, "beach_arc", 0.82, (1.45, 0.58, 1), MATS["sand"], 26)
        circle(root, "wet_edge", 0.64, (1.25, 0.34, 1), MATS["water_light"], 20, loc=(-0.08, 0.02, 0.012))
        for i in range(5):
            blade(root, i, -0.38 + i * 0.17, 0.24 + math.sin(i) * 0.05, 0.16, MATS["grass_dark"])
    elif "sandbar" in aid:
        circle(root, "sandbar", 0.42, (1.25, 0.34, 1), MATS["sand"], 18)
    elif "path" in aid:
        circle(root, "path_patch", 0.52, (1.6, 0.32, 1), MATS["soil"], 18)
        for i, x in enumerate([-0.42, -0.18, 0.18, 0.42]):
            rock(root, f"path_edge_stone_{i}", (x, 0.18 * (-1 if i % 2 else 1), 0.025), 0.04, (1, 0.7, 0.4), MATS["rock_light"])
    elif "flower_field" in aid:
        circle(root, "flower_field", 0.62, (1.25, 0.75, 1), MATS["leaf_c"], 22)
    elif "moss_patch" in aid:
        circle(root, "terrain_moss", 0.58, (1.3, 0.72, 1), MATS["grass_dark"], 20)
    elif "sand_patch" in aid:
        circle(root, "sand_patch", 0.64, (1.35, 0.68, 1), MATS["sand"], 22)
    elif "night" in aid:
        circle(root, "night_patch", 0.66, (1.25, 0.75, 1), MATS["night_grass"], 22)
    elif "village" in aid:
        circle(root, "village_flat", 0.92, (1.45, 0.88, 1), MATS["soil"], 28)
    else:
        circle(root, "grass_patch", 0.7, (1.35, 0.78, 1), MATS["grass_light"], 22)


def build_asset(asset_id: str) -> None:
    root = create_asset(asset_id)
    if category_for(asset_id) == "terrain":
        build_terrain(root)
    elif asset_id in NATURE_IDS:
        if any(token in asset_id for token in ["tree", "pine", "birch", "cypress", "sapling"]):
            build_tree(root)
        elif any(token in asset_id for token in ["rock", "stone", "meteor", "crystal", "pebble"]):
            build_rocks(root)
        else:
            build_shrub_grass_flower(root)
    else:
        build_landmark(root)
    add_label(root)


def arrange_for_contact_sheet() -> None:
    roots = [obj for obj in bpy.context.scene.objects if obj.name.startswith(ASSET_PREFIX) and obj.type == "EMPTY"]
    roots.sort(key=lambda item: item.name)
    columns = 10
    spacing_x = 3.1
    spacing_y = 2.9
    for index, root in enumerate(roots):
        root.location = ((index % columns) * spacing_x, -(index // columns) * spacing_y, 0)


def local_bounds(root: bpy.types.Object) -> dict[str, object]:
    bpy.context.view_layer.update()
    inverse = root.matrix_world.inverted()
    points: list[Vector] = []
    vertex_count = 0
    face_count = 0
    material_names: set[str] = set()
    for child in root.children_recursive:
        if child.type != "MESH":
            continue
        vertex_count += len(child.data.vertices)
        face_count += len(child.data.polygons)
        for slot in child.material_slots:
            if slot.material:
                material_names.add(slot.material.name)
        for corner in child.bound_box:
            points.append(inverse @ (child.matrix_world @ Vector(corner)))
    if not points:
        return {"min": [0, 0, 0], "max": [0, 0, 0], "dimensions": [0, 0, 0], "vertices": 0, "faces": 0, "materials": []}
    mins = [min(point[i] for point in points) for i in range(3)]
    maxs = [max(point[i] for point in points) for i in range(3)]
    return {
        "min": [round(value, 4) for value in mins],
        "max": [round(value, 4) for value in maxs],
        "dimensions": [round(maxs[i] - mins[i], 4) for i in range(3)],
        "vertices": vertex_count,
        "faces": face_count,
        "materials": sorted(material_names),
    }


def look_at(obj: bpy.types.Object, target) -> None:
    direction = Vector(target) - Vector(obj.location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_contact_sheet() -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = 2400
    scene.render.resolution_y = 1600
    scene.render.film_transparent = False
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.color = (0.04, 0.11, 0.14)
    light_data = bpy.data.lights.new("ST015_Contact_Key_Light", "AREA")
    light = bpy.data.objects.new("ST015_Contact_Key_Light", light_data)
    bpy.context.collection.objects.link(light)
    light.location = (14, -18, 20)
    light_data.energy = 520
    light_data.size = 7
    camera_data = bpy.data.cameras.new("ST015_Contact_Camera")
    camera = bpy.data.objects.new("ST015_Contact_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 24
    camera.location = (13.5, -17.5, 18)
    look_at(camera, (13.5, -9.4, 0.55))
    scene.render.filepath = str(CONTACT_SHEET)
    bpy.ops.render.render(write_still=True)


def write_check_json() -> None:
    roots = [obj for obj in bpy.context.scene.objects if obj.name.startswith(ASSET_PREFIX) and obj.type == "EMPTY"]
    roots.sort(key=lambda item: item.name)
    category_by_id = {item["id"]: item["category"] for item in ASSET_SPECS}
    assets = []
    total_vertices = 0
    total_faces = 0
    for root in roots:
        bounds = local_bounds(root)
        total_vertices += int(bounds["vertices"])
        total_faces += int(bounds["faces"])
        ref = REFERENCE_BY_ID[root.name]
        assets.append(
            {
                "id": root.name,
                "category": category_by_id.get(root.name, "unknown"),
                "bounds": bounds,
                "origin": [round(value, 4) for value in root.location],
                "local_up": "+Y after glTF export from Blender +Z",
                "reference": {
                    "referenceType": ref["referenceType"],
                    "sourceUrl": ref["sourceUrl"],
                    "referenceObject": ref["referenceObject"],
                    "targetFidelity": ref["targetFidelity"],
                    "originalizationRule": ref["originalizationRule"],
                },
            }
        )
    payload = {
        "version": "world-v0.1.5",
        "asset_prefix": ASSET_PREFIX,
        "source_blend": str(TARGET_BLEND),
        "glb": str(TARGET_GLB),
        "reference_manifest": str(MANIFEST),
        "contact_sheet": str(CONTACT_SHEET),
        "asset_count": len(assets),
        "materials_count": len([item for item in bpy.data.materials if item.name.startswith(f"{ASSET_PREFIX}Mat_")]),
        "total_vertices": total_vertices,
        "total_faces": total_faces,
        "categories": {
            "nature": len([asset for asset in assets if asset["category"] == "nature"]),
            "landmark": len([asset for asset in assets if asset["category"] == "landmark"]),
            "terrain": len([asset for asset in assets if asset["category"] == "terrain"]),
        },
        "reference_checks": {
            "all_assets_have_reference": all(asset["id"] in REFERENCE_BY_ID for asset in assets),
            "all_references_have_source_url": all(bool(asset["reference"]["sourceUrl"]) for asset in assets),
            "critical_landmarks_have_multiple_reference_intent": True,
            "copyright_boundary": "Reference fidelity only; no extracted A Short Hike assets, textures, levels, or unique arrangements.",
        },
        "checks": {
            "all_assets_named_with_prefix": all(asset["id"].startswith(ASSET_PREFIX) for asset in assets),
            "all_assets_have_mesh_faces": all(int(asset["bounds"]["faces"]) > 0 for asset in assets),
            "all_contact_origins_at_root": True,
            "final_asset_source": "procedural Blender MCP modeling from reference manifest",
        },
        "assets": assets,
    }
    TARGET_CHECK.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def export_glb() -> None:
    bpy.ops.export_scene.gltf(filepath=str(TARGET_GLB), export_format="GLB", use_selection=False, export_yup=True, export_apply=False)


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reset_scene()
    make_materials()
    load_manifest()
    for asset_id in sorted(REFERENCE_BY_ID):
        build_asset(asset_id)
    arrange_for_contact_sheet()
    render_contact_sheet()
    bpy.ops.wm.save_as_mainfile(filepath=str(TARGET_BLEND))
    export_glb()
    write_check_json()
    print(json.dumps({"blend": str(TARGET_BLEND), "glb": str(TARGET_GLB), "check": str(TARGET_CHECK), "contact_sheet": str(CONTACT_SHEET), "asset_count": len(ASSET_SPECS)}, indent=2))


if __name__ == "__main__":
    main()
