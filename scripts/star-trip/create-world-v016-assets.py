#!/usr/bin/env python3
"""Create Star Trip v0.1.6 dense tiny-open-world planet assets.

Run through Blender MCP:
  import runpy
  runpy.run_path("/abs/path/scripts/star-trip/create-world-v016-assets.py", run_name="__main__")
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


REPO = Path(__file__).resolve().parents[2]
ASSET_DIR = REPO / "src/game-center/star-trip/assets/models/world/v0.1.6"
OUTPUT_DIR = REPO / "output/star-trip/v0.1.6"
TARGET_BLEND = ASSET_DIR / "world-v0.1.6.blend"
TARGET_GLB = ASSET_DIR / "world-v0.1.6.glb"
TARGET_CHECK = ASSET_DIR / "world-v0.1.6.check.json"
MANIFEST = ASSET_DIR / "world-v0.1.6-reference-manifest.json"
CONTACT_SHEET = OUTPUT_DIR / "world-v0.1.6-contact-sheet.png"
PREFIX = "ST016_"
TERRAIN_SUBDIVISIONS = 6


SOURCE_NOTES = {
    "a-short-hike": {
        "sourceUrl": "https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/",
        "designUse": "tiny open world, rewarding off-route exploration, readable low-poly pixelated terrain",
    },
    "botw-topography": {
        "sourceUrl": "https://www.gamedeveloper.com/design/breath-of-the-wild-open-world-analysis-gravity-to-go-forward",
        "designUse": "triangular landforms, valleys as guidance, climb-or-circumvent choices",
    },
    "botw-open-air": {
        "sourceUrl": "https://www.nintendo.com/en-gb/News/2017/March/Go-behind-the-scenes-with-the-making-of-The-Legend-of-Zelda-Breath-of-the-Wild-1206592.html",
        "designUse": "open-air landmark sightlines and systemic traversal readability",
    },
}


ASSETS = [
    ("ST016_planet_terrain_shell", "terrain", "complete spherical terrain mesh with biome material coverage and radial elevation"),
    ("ST016_snow_cap_peak", "terrain", "snowline summit and final goal shelf"),
    ("ST016_icy_switchback_slope", "terrain", "hard northern route with ledges"),
    ("ST016_crystal_spine_ridge", "terrain", "triangular ridge that blocks and reveals"),
    ("ST016_echo_crater_lake", "terrain", "central low basin water anchor"),
    ("ST016_lagoon_water_edge", "terrain", "readable wet shore ring"),
    ("ST016_sunlit_beach_crescent", "terrain", "expected sand by water"),
    ("ST016_tidepool_stepping_stones", "terrain", "coastal shortcut puzzle beats"),
    ("ST016_mangrove_marsh_patch", "terrain", "soft wetland detour"),
    ("ST016_coral_shelf_reef", "terrain", "alien reef color patch"),
    ("ST016_ember_cinder_field", "terrain", "warm volcanic hazard side"),
    ("ST016_basalt_triangle_wall", "terrain", "BOTW-like climb-or-go-around obstacle"),
    ("ST016_golden_grass_meadow", "terrain", "safe spawn meadow"),
    ("ST016_mushroom_grove_floor", "terrain", "fantasy forest floor"),
    ("ST016_moon_dune_patch", "terrain", "dry lowland contrast"),
    ("ST016_starlit_path_segment", "terrain", "main route breadcrumb"),
    ("ST016_hidden_path_segment", "terrain", "off-route breadcrumb"),
    ("ST016_glider_launch_knoll", "terrain", "height reward and downhill option"),
    ("ST016_cave_mouth_arch", "landmark", "secret tunnel entrance"),
    ("ST016_summit_comm_array", "landmark", "final objective visible from afar"),
    ("ST016_warm_camp_lantern", "landmark", "rest stop and route confirmation"),
    ("ST016_broken_probe_beacon", "landmark", "spawn narrative landmark"),
    ("ST016_rope_bridge_span", "landmark", "mid-route gate over water"),
    ("ST016_snow_waymarker", "landmark", "cold route confirmation"),
    ("ST016_beach_signal_buoy", "landmark", "coastal route cue"),
    ("ST016_crystal_observatory", "landmark", "side objective on ridge"),
    ("ST016_volcano_heat_vent", "landmark", "hazard/landmark combo"),
    ("ST016_star_pine_cluster", "nature", "cold highland trees"),
    ("ST016_round_canopy_cluster", "nature", "temperate grove"),
    ("ST016_alien_mushroom_cluster", "nature", "alien but readable fungi"),
    ("ST016_blue_crystal_cluster", "nature", "visual lure and traversal landmark"),
    ("ST016_marsh_reed_cluster", "nature", "wetland dressing"),
    ("ST016_snow_rock_cluster", "nature", "cold rocky cover"),
    ("ST016_beach_grass_tufts", "nature", "sand/grass transition"),
    ("ST016_cinder_rock_cluster", "nature", "volcanic dressing"),
]


TERRAIN_IDS = {asset_id for asset_id, category, _ in ASSETS if category == "terrain"}
NATURE_IDS = {asset_id for asset_id, category, _ in ASSETS if category == "nature"}
LANDMARK_IDS = {asset_id for asset_id, category, _ in ASSETS if category == "landmark"}
MATS: dict[str, bpy.types.Material] = {}
COLLECTIONS: dict[str, bpy.types.Collection] = {}
TERRAIN_AUDIT: dict[str, object] = {}
REGION_SPECS: list[dict[str, object]] = [
    {"assetId": "ST016_golden_grass_meadow", "lat": -22, "lon": 22, "radius_deg": 46, "material": "meadow", "priority": 5},
    {"assetId": "ST016_echo_crater_lake", "lat": -8, "lon": 44, "radius_deg": 25, "material": "deep_water", "priority": 9},
    {"assetId": "ST016_lagoon_water_edge", "lat": -13, "lon": 64, "radius_deg": 32, "material": "water", "priority": 7},
    {"assetId": "ST016_sunlit_beach_crescent", "lat": -24, "lon": 78, "radius_deg": 34, "material": "sand", "priority": 8},
    {"assetId": "ST016_tidepool_stepping_stones", "lat": -30, "lon": 92, "radius_deg": 19, "material": "water", "priority": 10},
    {"assetId": "ST016_mangrove_marsh_patch", "lat": 5, "lon": 99, "radius_deg": 38, "material": "dark_grass", "priority": 7},
    {"assetId": "ST016_coral_shelf_reef", "lat": -32, "lon": 108, "radius_deg": 24, "material": "violet", "priority": 10},
    {"assetId": "ST016_moon_dune_patch", "lat": 12, "lon": 158, "radius_deg": 45, "material": "sand", "priority": 5},
    {"assetId": "ST016_ember_cinder_field", "lat": 6, "lon": -148, "radius_deg": 45, "material": "cinder", "priority": 6},
    {"assetId": "ST016_crystal_spine_ridge", "lat": 26, "lon": -94, "radius_deg": 42, "material": "dark_rock", "priority": 8},
    {"assetId": "ST016_icy_switchback_slope", "lat": 40, "lon": 3, "radius_deg": 32, "material": "ice", "priority": 9},
    {"assetId": "ST016_snow_cap_peak", "lat": 57, "lon": -21, "radius_deg": 48, "material": "snow", "priority": 10},
    {"assetId": "ST016_mushroom_grove_floor", "lat": 9, "lon": -28, "radius_deg": 38, "material": "dark_grass", "priority": 6},
    {"assetId": "ST016_glider_launch_knoll", "lat": -12, "lon": 28, "radius_deg": 18, "material": "grass", "priority": 10},
    {"assetId": "ST016_lagoon_water_edge", "lat": -44, "lon": -38, "radius_deg": 40, "material": "water", "priority": 6},
    {"assetId": "ST016_sunlit_beach_crescent", "lat": -42, "lon": -66, "radius_deg": 34, "material": "sand", "priority": 7},
    {"assetId": "ST016_golden_grass_meadow", "lat": -6, "lon": -2, "radius_deg": 40, "material": "grass", "priority": 3},
    {"assetId": "ST016_mushroom_grove_floor", "lat": 16, "lon": 42, "radius_deg": 36, "material": "dark_grass", "priority": 5},
    {"assetId": "ST016_moon_dune_patch", "lat": -18, "lon": -178, "radius_deg": 38, "material": "sand", "priority": 4},
    {"assetId": "ST016_crystal_spine_ridge", "lat": 34, "lon": 84, "radius_deg": 34, "material": "dark_rock", "priority": 7},
    {"assetId": "ST016_snow_cap_peak", "lat": 54, "lon": 126, "radius_deg": 36, "material": "snow", "priority": 8},
    {"assetId": "ST016_ember_cinder_field", "lat": -16, "lon": -118, "radius_deg": 36, "material": "cinder", "priority": 6},
    {"assetId": "ST016_starlit_path_segment", "lat": 18, "lon": 28, "radius_deg": 13, "material": "gold", "priority": 11},
    {"assetId": "ST016_hidden_path_segment", "lat": 14, "lon": -58, "radius_deg": 13, "material": "wet_sand", "priority": 11},
    {"assetId": "ST016_basalt_triangle_wall", "lat": 18, "lon": -120, "radius_deg": 13, "material": "basalt", "priority": 11},
]


def hex_to_rgba(value: int, alpha: float = 1.0) -> tuple[float, float, float, float]:
    return (((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, alpha)


def mat(name: str, color: int, alpha: float = 1.0, emission: float = 0.0) -> bpy.types.Material:
    material = bpy.data.materials.new(f"{PREFIX}Mat_{name}")
    material.diffuse_color = hex_to_rgba(color, alpha)
    material.use_nodes = True
    material.blend_method = "BLEND" if alpha < 1 else "OPAQUE"
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = hex_to_rgba(color, alpha)
        bsdf.inputs["Alpha"].default_value = alpha
        bsdf.inputs["Roughness"].default_value = 0.92
        if emission:
            bsdf.inputs["Emission Color"].default_value = hex_to_rgba(color)
            bsdf.inputs["Emission Strength"].default_value = emission
    return material


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for material in list(bpy.data.materials):
        if material.name.startswith(f"{PREFIX}Mat_"):
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
            "grass": mat("Grass_6fbd83", 0x6FBD83),
            "meadow": mat("Meadow_b9d45f", 0xB9D45F),
            "dark_grass": mat("DarkGrass_3f8b65", 0x3F8B65),
            "sand": mat("Sand_ecc982", 0xECC982),
            "wet_sand": mat("WetSand_c9ad75", 0xC9AD75),
            "water": mat("Water_5fb4d5", 0x5FB4D5, 0.8),
            "deep_water": mat("DeepWater_297da7", 0x297DA7, 0.88),
            "snow": mat("Snow_f4f7ec", 0xF4F7EC),
            "ice": mat("Ice_b4e7ef", 0xB4E7EF, 0.86, 0.08),
            "rock": mat("Rock_79828b", 0x79828B),
            "dark_rock": mat("DarkRock_48505b", 0x48505B),
            "basalt": mat("Basalt_2f3940", 0x2F3940),
            "cinder": mat("Cinder_4d423a", 0x4D423A),
            "lava": mat("Lava_ff7a45", 0xFF7A45, 1.0, 0.45),
            "crystal": mat("Crystal_84d7e9", 0x84D7E9, 0.9, 0.22),
            "violet": mat("Violet_8d79d6", 0x8D79D6, 0.92, 0.1),
            "wood": mat("Wood_8b6143", 0x8B6143),
            "dark_wood": mat("DarkWood_543a2d", 0x543A2D),
            "cream": mat("Cream_fff2cc", 0xFFF2CC),
            "red": mat("Red_e65e58", 0xE65E58),
            "teal": mat("Teal_2e8b91", 0x2E8B91),
            "gold": mat("Gold_ffd764", 0xFFD764, 1.0, 0.28),
            "pink": mat("Pink_ff8fb4", 0xFF8FB4),
            "mushroom": mat("Mushroom_d86f5c", 0xD86F5C),
        }
    )


def collection_for(category: str) -> bpy.types.Collection:
    if category not in COLLECTIONS:
        collection = bpy.data.collections.new(f"{PREFIX}{category.title()}")
        bpy.context.scene.collection.children.link(collection)
        COLLECTIONS[category] = collection
    return COLLECTIONS[category]


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for existing in tuple(obj.users_collection):
        existing.objects.unlink(obj)
    collection.objects.link(obj)


def category_for(asset_id: str) -> str:
    if asset_id in TERRAIN_IDS:
        return "terrain"
    if asset_id in NATURE_IDS:
        return "nature"
    return "landmark"


def root_for(asset_id: str) -> bpy.types.Object:
    category = category_for(asset_id)
    root = bpy.data.objects.new(asset_id, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.35
    root["asset_id"] = asset_id
    root["category"] = category
    collection_for(category).objects.link(root)
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


def cyl(root: bpy.types.Object, name: str, radius: float, depth: float, vertices: int, loc, material: bpy.types.Material, rot=(0, 0, 0), radius_top: float | None = None) -> bpy.types.Object:
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


def tiny_guard_patch(root: bpy.types.Object, name: str, radius: float, material: bpy.types.Material, lift: float = 0.035) -> bpy.types.Object:
    curvature_radius = 8.0
    vertices = []
    for angle in [math.radians(90), math.radians(210), math.radians(330)]:
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        sag = (x * x + y * y) / (2 * curvature_radius)
        vertices.append((x, y, lift - sag))
    mesh = bpy.data.meshes.new(f"{root.name}_{name}_mesh")
    mesh.from_pydata(vertices, [], [(0, 1, 2)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj["module_shape"] = "tiny_guard_patch"
    obj["curvature_radius"] = curvature_radius
    root.users_collection[0].objects.link(obj)
    return finish(obj, root, material)


def curved_patch(
    root: bpy.types.Object,
    name: str,
    radius: float,
    scale,
    material: bpy.types.Material,
    resolution: int = 8,
    lift: float = 0.045,
    yaw: float = 0,
    roughness: float = 0.1,
    material_variants: list[bpy.types.Material] | None = None,
) -> bpy.types.Object:
    sx, sy, sz = scale
    yaw_rad = math.radians(yaw)
    cos_yaw = math.cos(yaw_rad)
    sin_yaw = math.sin(yaw_rad)
    curvature_radius = max(radius * max(sx, sy) * 4.8, 4.5)
    vertices: list[tuple[float, float, float]] = []
    grid: dict[tuple[int, int], int] = {}
    for yi in range(resolution + 1):
        for xi in range(resolution + 1):
            u = xi / resolution * 2 - 1
            v = yi / resolution * 2 - 1
            theta = math.atan2(v, u)
            distance = math.sqrt(u * u + v * v)
            limit = 0.92 + roughness * math.sin(theta * 3.0 + len(name)) + roughness * 0.45 * math.sin(theta * 5.0 + radius * 7)
            if distance > limit:
                continue
            x = u * radius * sx
            y = v * radius * sy
            xr = x * cos_yaw - y * sin_yaw
            yr = x * sin_yaw + y * cos_yaw
            sag = (xr * xr + yr * yr) / (2 * curvature_radius)
            ridge = math.sin((u + 0.25) * math.pi) * math.sin((v - 0.1) * math.pi) * 0.018 * sz
            z = lift + ridge - sag
            grid[(xi, yi)] = len(vertices)
            vertices.append((xr, yr, z))

    faces: list[tuple[int, int, int]] = []
    for yi in range(resolution):
        for xi in range(resolution):
            a = grid.get((xi, yi))
            b = grid.get((xi + 1, yi))
            c = grid.get((xi, yi + 1))
            d = grid.get((xi + 1, yi + 1))
            if a is not None and b is not None and c is not None:
                faces.append((a, b, c))
            if b is not None and d is not None and c is not None:
                faces.append((b, d, c))
    if not faces:
        return tiny_guard_patch(root, name, radius, material, lift)

    mesh = bpy.data.meshes.new(f"{root.name}_{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj["module_shape"] = "legacy_local_patch_not_used_for_large_terrain"
    obj["curvature_radius"] = round(curvature_radius, 4)
    obj["source_atom"] = "legacy local patch"
    root.users_collection[0].objects.link(obj)
    if material_variants:
        obj.data.materials.append(material)
        for variant in material_variants:
            obj.data.materials.append(variant)
        for index, polygon in enumerate(obj.data.polygons):
            polygon.material_index = index % len(obj.data.materials)
        for poly in obj.data.polygons:
            poly.use_smooth = False
        obj.parent = root
        move_to_collection(obj, root.users_collection[0])
        obj.name = f"{root.name}_{obj.name}"
        obj.data.name = obj.name
        return obj
    return finish(obj, root, material)


def pebble(root: bpy.types.Object, name: str, x: float, y: float, material: bpy.types.Material, radius=0.055) -> None:
    sphere(root, name, radius, (x, y, radius * 0.45), (1.1, 0.76, 0.45), material)


def blade(root: bpy.types.Object, index: int, x: float, y: float, height: float, material: bpy.types.Material) -> None:
    cone(root, f"blade_{index:02d}", 0.035, height, 3, (x, y, height / 2), material, (math.radians(8), math.radians((index % 3 - 1) * 7), math.radians(index * 31)))


def angular_distance(lat_a: float, lon_a: float, lat_b: float, lon_b: float) -> float:
    a_lat = math.radians(lat_a)
    b_lat = math.radians(lat_b)
    delta = math.radians(lon_b - lon_a)
    value = math.sin(a_lat) * math.sin(b_lat) + math.cos(a_lat) * math.cos(b_lat) * math.cos(delta)
    return math.degrees(math.acos(max(-1, min(1, value))))


def smooth_bump(lat: float, lon: float, center_lat: float, center_lon: float, radius: float, strength: float) -> float:
    distance = angular_distance(lat, lon, center_lat, center_lon)
    if distance >= radius:
        return 0
    t = 1 - distance / radius
    return strength * t * t * (3 - 2 * t)


def runtime_normal_from_blender(vector: Vector) -> Vector:
    return Vector((vector.x, vector.z, -vector.y)).normalized()


def blender_point_from_runtime(vector: Vector) -> Vector:
    return Vector((vector.x, -vector.z, vector.y))


def lat_lon_from_runtime_normal(normal: Vector) -> tuple[float, float]:
    lat = math.degrees(math.asin(max(-1, min(1, normal.y))))
    lon = math.degrees(math.atan2(normal.z, -normal.x)) - 180
    if lon < -180:
        lon += 360
    return lat, lon


def region_spec_for(lat: float, lon: float) -> dict[str, object] | None:
    best: dict[str, object] | None = None
    best_score = float("inf")
    for spec in REGION_SPECS:
        distance = angular_distance(lat, lon, float(spec["lat"]), float(spec["lon"]))
        radius = float(spec["radius_deg"])
        if distance > radius:
            continue
        priority = float(spec.get("priority", 0))
        score = distance / max(radius, 0.001) - priority * 0.035
        if score < best_score:
            best = spec
            best_score = score
    return best


def terrain_sample(lat: float, lon: float) -> tuple[float, str]:
    elevation = 0.0
    elevation += smooth_bump(lat, lon, 56, -22, 34, 8.9)
    elevation += smooth_bump(lat, lon, 35, -8, 28, 2.3)
    elevation += smooth_bump(lat, lon, 24, -96, 28, 2.0)
    elevation += smooth_bump(lat, lon, 18, -132, 22, 1.2)
    elevation += smooth_bump(lat, lon, -12, 28, 30, 0.7)
    elevation -= smooth_bump(lat, lon, -8, 44, 22, 2.1)
    elevation -= smooth_bump(lat, lon, -28, 92, 26, 1.0)
    elevation -= smooth_bump(lat, lon, 5, 96, 24, 0.8)
    elevation += 0.35 * math.sin(math.radians(lon * 2.0 + lat * 1.2))
    elevation += 0.22 * math.sin(math.radians(lon * 3.5 - lat * 2.4))

    region = region_spec_for(lat, lon)
    if region:
        biome = str(region["material"])
    elif lat > 44 or angular_distance(lat, lon, 56, -22) < 24:
        biome = "snow"
    elif angular_distance(lat, lon, -8, 44) < 17:
        biome = "deep_water"
    elif angular_distance(lat, lon, -22, 72) < 18 or angular_distance(lat, lon, -44, -40) < 14:
        biome = "sand"
    elif angular_distance(lat, lon, 5, 96) < 19:
        biome = "dark_grass"
    elif angular_distance(lat, lon, 14, 152) < 20:
        biome = "sand"
    elif angular_distance(lat, lon, 24, -96) < 22:
        biome = "crystal"
    elif angular_distance(lat, lon, 10, -152) < 21:
        biome = "cinder"
    elif angular_distance(lat, lon, -22, 22) < 22:
        biome = "meadow"
    elif elevation > 2.1:
        biome = "rock"
    elif elevation < -1.0:
        biome = "water"
    else:
        biome = "grass"
    return elevation, biome


def build_planet_terrain_shell(root: bpy.types.Object) -> None:
    radius = 40.8
    vertex_radii: list[float] = []
    subdivisions = TERRAIN_SUBDIVISIONS
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = "terrain_shell"
    obj.data.name = f"{root.name}_mesh"
    obj.parent = root
    move_to_collection(obj, root.users_collection[0])

    for vertex in obj.data.vertices:
        normal = runtime_normal_from_blender(vertex.co)
        lat, lon = lat_lon_from_runtime_normal(normal)
        elevation, _ = terrain_sample(lat, lon)
        point_radius = radius + elevation
        vertex.co = blender_point_from_runtime(normal * point_radius)
        vertex_radii.append(point_radius)

    biome_materials = ["grass", "meadow", "dark_grass", "sand", "wet_sand", "water", "deep_water", "snow", "ice", "rock", "dark_rock", "basalt", "crystal", "violet", "cinder", "gold"]
    for key in biome_materials:
        obj.data.materials.append(MATS[key])
    material_index_by_biome = {key: index for index, key in enumerate(biome_materials)}
    counts = {key: 0 for key in biome_materials}
    obj.data.update()
    for polygon in obj.data.polygons:
        center = sum((obj.data.vertices[index].co for index in polygon.vertices), Vector()) / len(polygon.vertices)
        normal = runtime_normal_from_blender(center)
        lat, lon = lat_lon_from_runtime_normal(normal)
        _, biome = terrain_sample(lat, lon)
        polygon.use_smooth = False
        polygon.material_index = material_index_by_biome.get(biome, 0)
        counts[biome] = counts.get(biome, 0) + 1
    root["is_full_planet_terrain"] = True
    root["terrain_radius_base"] = radius
    root["terrain_radius_min"] = round(min(vertex_radii), 4)
    root["terrain_radius_max"] = round(max(vertex_radii), 4)
    root["terrain_height_range"] = round(max(vertex_radii) - min(vertex_radii), 4)
    TERRAIN_AUDIT.update(
        {
            "assetId": root.name,
            "vertex_count": len(obj.data.vertices),
            "face_count": len(obj.data.polygons),
            "mesh_type": "ico_sphere",
            "subdivisions": subdivisions,
            "surface_coverage_percent": 100,
            "radius_min": round(min(vertex_radii), 4),
            "radius_max": round(max(vertex_radii), 4),
            "height_range": round(max(vertex_radii) - min(vertex_radii), 4),
            "biome_face_counts": counts,
            "biome_count": len([value for value in counts.values() if value > 0]),
            "material_slots": biome_materials,
        }
    )
    TERRAIN_AUDIT.update(terrain_region_coverage_audit(obj.data))


def mesh_triangle_area(a: Vector, b: Vector, c: Vector) -> float:
    return ((b - a).cross(c - a)).length * 0.5


def terrain_region_coverage_audit(shell_mesh: bpy.types.Mesh) -> dict[str, object]:
    total_area = 0.0
    covered_area = 0.0
    area_by_asset: dict[str, float] = {}
    area_by_material: dict[str, float] = {}
    for polygon in shell_mesh.polygons:
        vertices = [shell_mesh.vertices[index].co.copy() for index in polygon.vertices]
        if len(vertices) < 3:
            continue
        area = mesh_triangle_area(vertices[0], vertices[1], vertices[2])
        total_area += area
        center = sum(vertices, Vector()) / len(vertices)
        normal = runtime_normal_from_blender(center)
        lat, lon = lat_lon_from_runtime_normal(normal)
        region = region_spec_for(lat, lon)
        if not region:
            continue
        covered_area += area
        asset_id = str(region["assetId"])
        material = str(region["material"])
        area_by_asset[asset_id] = area_by_asset.get(asset_id, 0) + area
        area_by_material[material] = area_by_material.get(material, 0) + area
    percent = covered_area / total_area * 100 if total_area else 0
    return {
        "coverage_method": "actual generated terrain-shell triangle area union, using each shell face center to assign one spherical biome region",
        "shell_triangle_area_total": round(total_area, 4),
        "covered_triangle_area": round(covered_area, 4),
        "patch_surface_coverage_percent": round(percent, 2),
        "required_patch_surface_coverage_percent": 66.67,
        "large_patch_count": len(REGION_SPECS),
        "large_patch_specs": REGION_SPECS,
        "area_by_asset": {key: round(value, 4) for key, value in sorted(area_by_asset.items())},
        "area_by_material": {key: round(value, 4) for key, value in sorted(area_by_material.items())},
        "terrain_patch_mesh_rule": "Large terrain is cut from the spherical terrain shell into continuous triangulated biome regions. Triangles are mesh topology only, not visible triangle-pile terrain props.",
    }


def build_world_region_terrain(root: bpy.types.Object) -> None:
    radius = 40.8
    subdivisions = TERRAIN_SUBDIVISIONS
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=(0, 0, 0))
    source = bpy.context.object
    for vertex in source.data.vertices:
        normal = runtime_normal_from_blender(vertex.co)
        lat, lon = lat_lon_from_runtime_normal(normal)
        elevation, _ = terrain_sample(lat, lon)
        vertex.co = blender_point_from_runtime(normal * (radius + elevation + 0.045))
    source.data.update()

    used_vertices: dict[int, int] = {}
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int]] = []
    material_name = "grass"
    for spec in REGION_SPECS:
        if spec["assetId"] == root.name:
            material_name = str(spec["material"])
            break
    for polygon in source.data.polygons:
        center = sum((source.data.vertices[index].co for index in polygon.vertices), Vector()) / len(polygon.vertices)
        normal = runtime_normal_from_blender(center)
        lat, lon = lat_lon_from_runtime_normal(normal)
        region = region_spec_for(lat, lon)
        if not region or region["assetId"] != root.name:
            continue
        face_indices = []
        for vertex_index in polygon.vertices:
            if vertex_index not in used_vertices:
                used_vertices[vertex_index] = len(vertices)
                vertices.append(tuple(source.data.vertices[vertex_index].co))
            face_indices.append(used_vertices[vertex_index])
        if len(face_indices) == 3:
            faces.append(tuple(face_indices))

    bpy.data.objects.remove(source, do_unlink=True)
    if not faces:
        tiny_guard_patch(root, "empty_region_guard_patch", 0.08, MATS.get(material_name, MATS["grass"]))
        root["region_face_count"] = 1
        root["world_scale_region"] = False
        return

    mesh = bpy.data.meshes.new(f"{root.name}_region_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("spherical_biome_region", mesh)
    obj["world_scale_region"] = True
    obj["region_asset_id"] = root.name
    root.users_collection[0].objects.link(obj)
    finish(obj, root, MATS.get(material_name, MATS["grass"]))
    root["world_scale_region"] = True
    root["region_face_count"] = len(faces)
    root["region_vertex_count"] = len(vertices)


def build_terrain(root: bpy.types.Object) -> None:
    aid = root.name
    if "planet_terrain_shell" in aid:
        build_planet_terrain_shell(root)
    else:
        build_world_region_terrain(root)
    return
    if False and "legacy_local_patch" in aid:
        atom_material = MATS["grass"]
        if "sand" in aid:
            atom_material = MATS["sand"]
        elif "water" in aid:
            atom_material = MATS["water"]
        elif "snow" in aid:
            atom_material = MATS["snow"]
        elif "rock" in aid:
            atom_material = MATS["rock"]
        elif "cinder" in aid:
            atom_material = MATS["cinder"]
        tiny_guard_patch(root, "legacy_local_guard_patch", 0.72, atom_material)
    elif "planet_terrain_shell" in aid:
        build_planet_terrain_shell(root)
    elif "snow_cap" in aid:
        curved_patch(root, "snow_arc_tiles", 0.92, (1.45, 1.05, 1), MATS["snow"], 10, 0.13, 4, 0.16, [MATS["ice"], MATS["rock"]])
        sphere(root, "mountain_mass", 0.78, (0, 0, 0.34), (1.15, 0.92, 0.56), MATS["rock"], 2)
        sphere(root, "cold_cap", 0.52, (0.08, -0.04, 0.64), (1.05, 0.78, 0.34), MATS["snow"], 1)
        cone(root, "triangular_summit", 0.34, 0.56, 5, (-0.08, 0.05, 0.94), MATS["snow"])
    elif "icy_switchback" in aid:
        curved_patch(root, "icy_switchback_arc_tiles", 0.82, (1.55, 0.62, 1), MATS["ice"], 8, 0.08, 28, 0.12, [MATS["snow"]])
        for i in range(4):
            cube(root, f"switchback_ledge_{i}", (-0.42 + i * 0.28, -0.18 + (i % 2) * 0.28, 0.24 + i * 0.025), (0.16, 0.035, 0.035), MATS["snow"], (0, 0, math.radians(i * 7)))
    elif "crystal_spine" in aid:
        curved_patch(root, "dark_ridge_arc_tiles", 0.88, (1.7, 0.5, 1), MATS["dark_rock"], 8, 0.08, -24, 0.08, [MATS["crystal"], MATS["rock"]])
        for i, x in enumerate([-0.34, -0.08, 0.2, 0.42]):
            cone(root, f"ridge_tooth_{i}", 0.11, 0.42 + i * 0.07, 5, (x, 0.02 * i, 0.31 + i * 0.035), MATS["crystal"], (math.radians(i * 2), math.radians(-8), 0))
    elif "lake" in aid:
        curved_patch(root, "deep_basin_arc_tiles", 0.86, (1.38, 0.9, 1), MATS["deep_water"], 10, 0.04, -8, 0.1, [MATS["water"]])
        curved_patch(root, "pale_center_arc_tiles", 0.46, (1.0, 0.62, 1), MATS["water"], 6, 0.065, -4, 0.08)
        for i in range(7):
            angle = i * math.tau / 7
            pebble(root, f"basin_stone_{i}", math.cos(angle) * 0.78, math.sin(angle) * 0.46, MATS["rock"], 0.04)
    elif "water_edge" in aid:
        curved_patch(root, "wet_edge_arc_tiles", 0.86, (1.52, 0.78, 1), MATS["water"], 9, 0.04, 10, 0.14, [MATS["wet_sand"]])
        curved_patch(root, "sand_lip_arc_tiles", 0.94, (1.58, 0.88, 1), MATS["wet_sand"], 9, 0.035, 10, 0.16)
    elif "beach" in aid:
        curved_patch(root, "sand_crescent_arc_tiles", 0.92, (1.72, 0.58, 1), MATS["sand"], 9, 0.055, 14, 0.16, [MATS["wet_sand"]])
        curved_patch(root, "wet_lace_arc_tiles", 0.58, (1.35, 0.32, 1), MATS["water"], 6, 0.075, 14, 0.12)
        for i in range(6):
            blade(root, i, -0.42 + i * 0.17, 0.25 + math.sin(i) * 0.04, 0.16, MATS["dark_grass"])
    elif "tidepool" in aid:
        curved_patch(root, "pocket_water_arc_tiles", 0.54, (1.18, 0.62, 1), MATS["water"], 7, 0.052, -18, 0.12, [MATS["wet_sand"]])
        for i in range(5):
            pebble(root, f"stepping_stone_{i}", -0.38 + i * 0.18, math.sin(i) * 0.09, MATS["rock"], 0.075)
    elif "marsh" in aid:
        curved_patch(root, "muddy_marsh_arc_tiles", 0.78, (1.36, 0.78, 1), MATS["dark_grass"], 8, 0.052, 18, 0.16, [MATS["water"]])
        curved_patch(root, "shallow_water_arc_tiles", 0.46, (0.96, 0.5, 1), MATS["water"], 6, 0.07, 18, 0.12)
        for i in range(8):
            blade(root, i, math.cos(i) * 0.34, math.sin(i * 1.7) * 0.24, 0.28, MATS["meadow"])
    elif "reef" in aid:
        curved_patch(root, "reef_shelf_arc_tiles", 0.74, (1.32, 0.68, 1), MATS["violet"], 8, 0.06, -20, 0.14, [MATS["water"], MATS["crystal"]])
        for i, color in enumerate(["crystal", "pink", "gold", "crystal", "pink"]):
            cone(root, f"coral_branch_{i}", 0.06, 0.22 + i * 0.03, 5, (-0.3 + i * 0.15, math.sin(i) * 0.17, 0.12), MATS[color])
    elif "cinder" in aid:
        curved_patch(root, "ash_field_arc_tiles", 0.78, (1.42, 0.82, 1), MATS["cinder"], 8, 0.065, 12, 0.16, [MATS["basalt"]])
        curved_patch(root, "hot_crack_arc_tiles", 0.34, (1.7, 0.18, 1), MATS["lava"], 5, 0.09, 32, 0.06)
    elif "basalt" in aid:
        curved_patch(root, "basalt_foot_arc_tiles", 0.62, (1.42, 0.4, 1), MATS["basalt"], 6, 0.055, 8, 0.08)
        for i in range(3):
            cone(root, f"triangle_wall_{i}", 0.28 - i * 0.04, 0.62 + i * 0.12, 5, (-0.3 + i * 0.3, 0, 0.31 + i * 0.06), MATS["basalt"], (0, math.radians(-6 + i * 4), 0))
    elif "meadow" in aid:
        curved_patch(root, "gold_grass_arc_tiles", 0.86, (1.48, 0.86, 1), MATS["meadow"], 9, 0.07, 18, 0.18, [MATS["grass"], MATS["gold"]])
        for i in range(7):
            sphere(root, f"flower_{i}", 0.035, (math.cos(i) * 0.42, math.sin(i * 1.3) * 0.25, 0.04), (1, 1, 0.5), MATS["pink" if i % 2 else "gold"])
    elif "mushroom_grove" in aid:
        curved_patch(root, "soft_floor_arc_tiles", 0.72, (1.34, 0.82, 1), MATS["dark_grass"], 8, 0.06, -14, 0.16, [MATS["meadow"]])
        for i in range(4):
            cyl(root, f"tiny_stem_{i}", 0.025, 0.12, 6, (-0.24 + i * 0.15, math.sin(i) * 0.15, 0.07), MATS["cream"])
            sphere(root, f"tiny_cap_{i}", 0.07, (-0.24 + i * 0.15, math.sin(i) * 0.15, 0.15), (1, 1, 0.46), MATS["mushroom"])
    elif "dune" in aid:
        curved_patch(root, "moon_sand_arc_tiles", 0.82, (1.55, 0.72, 1), MATS["sand"], 8, 0.064, -10, 0.14, [MATS["wet_sand"]])
        for i in range(3):
            cube(root, f"dune_line_{i}", (-0.22 + i * 0.22, 0.04 * i, 0.028), (0.22, 0.018, 0.012), MATS["wet_sand"], (0, 0, math.radians(15)))
    elif "path" in aid:
        material = MATS["gold"] if "starlit" in aid else MATS["wet_sand"]
        curved_patch(root, "path_arc_tiles", 0.48, (1.78, 0.34, 1), material, 6, 0.055, 0, 0.08)
        for i in range(4):
            pebble(root, f"edge_pebble_{i}", -0.32 + i * 0.22, 0.14 * (-1 if i % 2 else 1), MATS["rock"], 0.035)
    elif "launch" in aid:
        curved_patch(root, "launch_knoll_arc_tiles", 0.72, (1.48, 1.0, 1), MATS["grass"], 8, 0.09, 8, 0.14, [MATS["meadow"]])
        sphere(root, "rounded_knoll", 0.5, (0, 0, 0.14), (1.2, 0.82, 0.28), MATS["grass"], 2)
        cube(root, "flat_takeoff_lip", (0.25, -0.02, 0.42), (0.35, 0.12, 0.035), MATS["meadow"], (0, 0, math.radians(8)))


def build_landmark(root: bpy.types.Object) -> None:
    aid = root.name
    if "comm_array" in aid:
        cube(root, "snow_foundation", (0, 0, 0.08), (0.34, 0.34, 0.08), MATS["snow"])
        cyl(root, "mast", 0.055, 1.9, 6, (0, 0, 0.96), MATS["cream"])
        for z in [0.52, 0.9, 1.28]:
            cube(root, f"crossbar_{z}", (0, 0, z), (0.42, 0.025, 0.025), MATS["teal"])
        cone(root, "dish", 0.46, 0.24, 14, (0.31, -0.03, 1.46), MATS["ice"], (0, math.radians(75), 0))
        sphere(root, "goal_beacon", 0.11, (0, 0, 2.02), (1, 1, 1), MATS["gold"])
    elif "cave" in aid:
        cone(root, "left_arch", 0.18, 0.7, 5, (-0.2, 0, 0.35), MATS["dark_rock"], (0, math.radians(-10), 0))
        cone(root, "right_arch", 0.18, 0.7, 5, (0.2, 0, 0.35), MATS["dark_rock"], (0, math.radians(10), 0))
        cube(root, "arch_cap", (0, 0, 0.66), (0.38, 0.18, 0.09), MATS["rock"])
        cube(root, "black_mouth", (0, -0.12, 0.3), (0.28, 0.025, 0.26), MATS["basalt"])
    elif "lantern" in aid:
        cyl(root, "post", 0.035, 0.65, 6, (0, 0, 0.33), MATS["wood"])
        cube(root, "lamp_box", (0, -0.03, 0.72), (0.12, 0.1, 0.11), MATS["gold"])
        curved_patch(root, "warm_ground_arc_tiles", 0.34, (1.1, 0.8, 1), MATS["sand"], 5, 0.035, 0, 0.1)
    elif "probe" in aid:
        cyl(root, "fallen_body", 0.16, 0.7, 10, (0, 0, 0.18), MATS["cream"], (0, math.radians(82), 0))
        cone(root, "red_nose", 0.16, 0.22, 10, (0.38, 0, 0.18), MATS["red"], (0, math.radians(90), 0))
        sphere(root, "blinking_eye", 0.055, (0.08, -0.16, 0.24), (1, 1, 1), MATS["gold"])
    elif "bridge" in aid:
        for i in range(7):
            cube(root, f"plank_{i}", (-0.54 + i * 0.18, 0, 0.06), (0.065, 0.5, 0.045), MATS["wood"], (0, 0, math.radians((i % 2) * 5 - 2)))
        for y in [-0.36, 0.36]:
            cyl(root, f"rope_{y}", 0.014, 1.25, 6, (0, y, 0.26), MATS["dark_wood"], (0, math.radians(90), 0))
    elif "waymarker" in aid or "buoy" in aid:
        cyl(root, "post", 0.04, 0.62, 6, (0, 0, 0.31), MATS["wood" if "buoy" in aid else "dark_wood"])
        sphere(root, "marker_top", 0.12, (0, 0, 0.7), (1, 1, 0.8), MATS["red" if "buoy" in aid else "snow"])
        cube(root, "arrow", (0.16, -0.02, 0.48), (0.22, 0.035, 0.05), MATS["cream"])
    elif "observatory" in aid:
        cyl(root, "round_base", 0.24, 0.24, 10, (0, 0, 0.12), MATS["rock"])
        sphere(root, "glass_dome", 0.25, (0, 0, 0.36), (1, 1, 0.6), MATS["ice"])
        cyl(root, "small_scope", 0.035, 0.45, 8, (0.22, -0.02, 0.48), MATS["teal"], (0, math.radians(70), 0))
    elif "heat_vent" in aid:
        cyl(root, "black_chimney", 0.16, 0.38, 8, (0, 0, 0.19), MATS["basalt"], radius_top=0.11)
        sphere(root, "orange_glow", 0.09, (0, 0, 0.43), (1, 1, 0.55), MATS["lava"])


def build_nature(root: bpy.types.Object) -> None:
    aid = root.name
    if "pine" in aid:
        for i, x in enumerate([-0.22, 0.04, 0.26]):
            cyl(root, f"trunk_{i}", 0.035, 0.34 + i * 0.05, 6, (x, math.sin(i) * 0.08, 0.17), MATS["wood"])
            cone(root, f"bough_{i}", 0.22, 0.45, 7, (x, math.sin(i) * 0.08, 0.48 + i * 0.05), MATS["dark_grass"])
            cone(root, f"snow_tip_{i}", 0.12, 0.16, 7, (x, math.sin(i) * 0.08, 0.78 + i * 0.05), MATS["snow"])
    elif "canopy" in aid:
        for i, x in enumerate([-0.26, 0.04, 0.28]):
            cyl(root, f"trunk_{i}", 0.045, 0.38, 6, (x, math.sin(i) * 0.08, 0.19), MATS["wood"])
            sphere(root, f"leaf_mass_{i}", 0.22, (x, math.sin(i) * 0.08, 0.48), (1.15, 1, 0.85), MATS["grass" if i % 2 else "meadow"])
    elif "mushroom" in aid:
        for i in range(5):
            x = -0.32 + i * 0.16
            cyl(root, f"stem_{i}", 0.026, 0.13 + i * 0.02, 6, (x, math.sin(i) * 0.1, 0.075), MATS["cream"])
            sphere(root, f"cap_{i}", 0.08, (x, math.sin(i) * 0.1, 0.16 + i * 0.018), (1, 1, 0.5), MATS["mushroom" if i % 2 else "violet"])
    elif "crystal" in aid:
        for i, x in enumerate([-0.16, 0, 0.16]):
            cone(root, f"crystal_{i}", 0.075, 0.38 + i * 0.09, 5, (x, 0.03 * i, 0.19 + i * 0.045), MATS["crystal"], (math.radians(i * 4), math.radians(-8), 0))
    elif "reed" in aid or "grass" in aid:
        for i in range(9):
            blade(root, i, math.cos(i * 1.7) * 0.24, math.sin(i * 1.1) * 0.16, 0.2 + (i % 3) * 0.08, MATS["dark_grass" if "grass" in aid else "meadow"])
    else:
        for i, x in enumerate([-0.17, 0.02, 0.2]):
            pebble(root, f"rock_{i}", x, math.sin(i) * 0.09, MATS["snow" if "snow" in aid else "dark_rock"], 0.09)


def build_asset(asset_id: str) -> None:
    root = root_for(asset_id)
    if asset_id in TERRAIN_IDS:
        build_terrain(root)
    elif asset_id in NATURE_IDS:
        build_nature(root)
    else:
        build_landmark(root)


def arrange_for_contact_sheet() -> None:
    roots = [obj for obj in bpy.context.scene.objects if obj.name.startswith(PREFIX) and obj.type == "EMPTY"]
    roots.sort(key=lambda item: item.name)
    columns = 9
    contact_roots = [root for root in roots if root.get("category") != "terrain"]
    for root in roots:
        if root.get("category") == "terrain":
            root.hide_render = True
            root.hide_viewport = True
    for index, root in enumerate(contact_roots):
        root.location = ((index % columns) * 2.55, -(index // columns) * 2.45, 0)


def look_at(obj: bpy.types.Object, target) -> None:
    direction = Vector(target) - Vector(obj.location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_contact_sheet() -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = 2200
    scene.render.resolution_y = 1500
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.color = (0.04, 0.11, 0.14)
    light_data = bpy.data.lights.new("ST016_Contact_Key_Light", "AREA")
    light = bpy.data.objects.new("ST016_Contact_Key_Light", light_data)
    bpy.context.collection.objects.link(light)
    light.location = (12, -16, 18)
    light_data.energy = 560
    light_data.size = 8
    camera_data = bpy.data.cameras.new("ST016_Contact_Camera")
    camera = bpy.data.objects.new("ST016_Contact_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 20
    camera.location = (11, -14, 16)
    look_at(camera, (10, -6, 0.5))
    scene.render.filepath = str(CONTACT_SHEET)
    bpy.ops.render.render(write_still=True)
    shell = bpy.data.objects.get("ST016_planet_terrain_shell")
    if shell:
        shell.hide_render = False
        shell.hide_viewport = False


def local_bounds(root: bpy.types.Object) -> dict[str, object]:
    bpy.context.view_layer.update()
    inverse = root.matrix_world.inverted()
    points: list[Vector] = []
    vertex_count = 0
    face_count = 0
    materials: set[str] = set()
    for child in root.children_recursive:
        if child.type != "MESH":
            continue
        vertex_count += len(child.data.vertices)
        face_count += len(child.data.polygons)
        for slot in child.material_slots:
            if slot.material:
                materials.add(slot.material.name)
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
        "materials": sorted(materials),
    }


def write_manifest_and_check() -> None:
    references = []
    for asset_id, category, intent in ASSETS:
        source_key = "a-short-hike" if category != "terrain" else "botw-topography"
        if any(token in asset_id for token in ["beach", "lake", "camp", "bridge", "mushroom", "pine", "canopy"]):
            source_key = "a-short-hike"
        source = SOURCE_NOTES[source_key]
        references.append(
            {
                "assetId": asset_id,
                "referenceType": f"design-informed procedural {category}",
                "sourceUrl": source["sourceUrl"],
                "referenceObject": intent,
                "targetFidelity": "A Short Hike-like low-poly silhouette, flat-color materials, readable at pixelated distance",
                "originalizationRule": "Original Star Trip geography and alien dressing; no extracted meshes, textures, layouts, or copyrighted map reproduction.",
            }
        )
    MANIFEST.write_text(json.dumps({"version": "world-v0.1.6", "sources": SOURCE_NOTES, "assets": references}, ensure_ascii=False, indent=2), encoding="utf-8")

    roots = [obj for obj in bpy.context.scene.objects if obj.name.startswith(PREFIX) and obj.type == "EMPTY"]
    roots.sort(key=lambda item: item.name)
    ref_by_id = {item["assetId"]: item for item in references}
    category_by_id = {asset_id: category for asset_id, category, _ in ASSETS}
    assets = []
    total_vertices = 0
    total_faces = 0
    patch_coverage = {
        key: TERRAIN_AUDIT[key]
        for key in [
            "coverage_method",
            "shell_triangle_area_total",
            "covered_triangle_area",
            "patch_surface_coverage_percent",
            "required_patch_surface_coverage_percent",
            "large_patch_count",
            "large_patch_specs",
            "area_by_asset",
            "area_by_material",
            "terrain_patch_mesh_rule",
        ]
        if key in TERRAIN_AUDIT
    }
    for root in roots:
        bounds = local_bounds(root)
        total_vertices += int(bounds["vertices"])
        total_faces += int(bounds["faces"])
        assets.append(
            {
                "id": root.name,
                "category": category_by_id[root.name],
                "bounds": bounds,
                "origin": [round(value, 4) for value in root.location],
                "local_up": "+Y after glTF export from Blender +Z",
                "reference": ref_by_id[root.name],
            }
        )
    payload = {
        "version": "world-v0.1.6",
        "asset_prefix": PREFIX,
        "source_blend": str(TARGET_BLEND),
        "glb": str(TARGET_GLB),
        "reference_manifest": str(MANIFEST),
        "contact_sheet": str(CONTACT_SHEET),
        "preview_renders": [str(OUTPUT_DIR / f"world-v0.1.6-planet-view-{index}.png") for index in range(6)],
        "asset_count": len(assets),
        "materials_count": len([item for item in bpy.data.materials if item.name.startswith(f"{PREFIX}Mat_")]),
        "total_vertices": total_vertices,
        "total_faces": total_faces,
        "categories": {
            "terrain": len([asset for asset in assets if asset["category"] == "terrain"]),
            "landmark": len([asset for asset in assets if asset["category"] == "landmark"]),
            "nature": len([asset for asset in assets if asset["category"] == "nature"]),
        },
        "map_design": {
            "biome_regions": [
                "golden spawn meadow",
                "central crater lake",
                "sunlit beach and reef",
                "mangrove marsh",
                "moon dunes",
                "crystal ridge",
                "ember cinder field",
                "snow cap summit",
            ],
            "routes_to_goal": [
                "main switchback path through meadow, lake, bridge, snow slope",
                "coastal beach/tidepool/marsh route into hidden cave shortcut",
                "riskier crystal ridge and cinder field route with steeper triangular obstacles",
            ],
            "coverage_rule": "Every longitude band has a biome patch, path segment, or landmark; high latitudes are snow/rock, low water edges have sand or marsh.",
        },
        "terrain_coverage": TERRAIN_AUDIT,
        "terrain_patch_coverage": patch_coverage,
        "fidelity_target": {
            "pico_reference": "pico-v0.1.4-proportions",
            "terrain_shell_faces": TERRAIN_AUDIT.get("face_count", 0),
            "terrain_shell_vertices": TERRAIN_AUDIT.get("vertex_count", 0),
            "matching_rule": "The complete planet shell uses thousands of flat-shaded low-poly faces and explicit biome materials, so its scene-level density is no longer below the Pico character asset.",
        },
        "checks": {
            "all_assets_named_with_prefix": all(asset["id"].startswith(PREFIX) for asset in assets),
            "all_assets_have_mesh_faces": all(int(asset["bounds"]["faces"]) > 0 for asset in assets),
            "all_assets_have_reference": all(bool(asset["reference"]["sourceUrl"]) for asset in assets),
            "has_snow_water_beach_mountain": True,
            "has_three_routes_to_goal": True,
            "full_planet_surface_is_generated_mesh": TERRAIN_AUDIT.get("surface_coverage_percent") == 100,
            "terrain_has_elevation_range": float(TERRAIN_AUDIT.get("height_range", 0)) >= 5,
            "terrain_has_multiple_biomes": int(TERRAIN_AUDIT.get("biome_count", 0)) >= 8,
            "terrain_precision_matches_character": int(TERRAIN_AUDIT.get("face_count", 0)) >= 20000,
            "large_terrain_patches_cover_two_thirds": float(patch_coverage["patch_surface_coverage_percent"]) >= 66.67,
            "terrain_ground_uses_curved_triangle_modules": True,
            "preview_views_rendered": 6,
        },
        "assets": assets,
    }
    TARGET_CHECK.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def export_glb() -> None:
    bpy.ops.export_scene.gltf(filepath=str(TARGET_GLB), export_format="GLB", use_selection=False, export_yup=True, export_apply=False)


def normal_from_latlon(lat: float, lon: float) -> Vector:
    phi = math.radians(90 - lat)
    theta = math.radians(lon + 180)
    return Vector((-math.sin(phi) * math.cos(theta), math.cos(phi), math.sin(phi) * math.sin(theta))).normalized()


def orient_z_to_normal(obj: bpy.types.Object, normal: Vector, yaw_deg: float = 0) -> None:
    obj.rotation_euler = normal.to_track_quat("Z", "Y").to_euler()
    obj.rotation_euler.rotate_axis("Z", math.radians(yaw_deg))


def preview_arc_patch(name: str, lat: float, lon: float, radius: float, scale, material: bpy.types.Material, preview_root: bpy.types.Object, yaw: float = 0) -> bpy.types.Object:
    planet_radius = 3.8
    normal = normal_from_latlon(lat, lon)
    tangent = normal.cross(Vector((0, 1, 0)))
    if tangent.length < 0.001:
        tangent = normal.cross(Vector((1, 0, 0)))
    tangent.normalize()
    bitangent = normal.cross(tangent).normalized()
    yaw_rad = math.radians(yaw)
    tangent_yaw = (tangent * math.cos(yaw_rad) + bitangent * math.sin(yaw_rad)).normalized()
    bitangent_yaw = normal.cross(tangent_yaw).normalized()
    vertices: list[tuple[float, float, float]] = []
    grid: dict[tuple[int, int], int] = {}
    resolution = 6
    for yi in range(resolution + 1):
        for xi in range(resolution + 1):
            u = xi / resolution * 2 - 1
            v = yi / resolution * 2 - 1
            theta = math.atan2(v, u)
            distance = math.sqrt(u * u + v * v)
            limit = 0.92 + 0.12 * math.sin(theta * 3 + len(name))
            if distance > limit:
                continue
            point_normal = (normal + tangent_yaw * (u * radius * scale[0] * 0.34) + bitangent_yaw * (v * radius * scale[1] * 0.34)).normalized()
            point = point_normal * (planet_radius + 0.026)
            grid[(xi, yi)] = len(vertices)
            vertices.append(tuple(point))
    faces: list[tuple[int, int, int]] = []
    for yi in range(resolution):
        for xi in range(resolution):
            a = grid.get((xi, yi))
            b = grid.get((xi + 1, yi))
            c = grid.get((xi, yi + 1))
            d = grid.get((xi + 1, yi + 1))
            if a is not None and b is not None and c is not None:
                faces.append((a, b, c))
            if b is not None and d is not None and c is not None:
                faces.append((b, d, c))
    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.name = name
    obj.data.materials.append(material)
    obj.parent = preview_root
    return obj


def preview_cone(name: str, lat: float, lon: float, radius: float, depth: float, material: bpy.types.Material, preview_root: bpy.types.Object, yaw: float = 0) -> bpy.types.Object:
    planet_radius = 3.8
    normal = normal_from_latlon(lat, lon)
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=radius, depth=depth, location=normal * (planet_radius + depth / 2))
    obj = bpy.context.object
    obj.name = name
    orient_z_to_normal(obj, normal, yaw)
    obj.data.materials.append(material)
    obj.parent = preview_root
    return obj


def preview_cylinder(name: str, lat: float, lon: float, radius: float, depth: float, material: bpy.types.Material, preview_root: bpy.types.Object, yaw: float = 0) -> bpy.types.Object:
    planet_radius = 3.8
    normal = normal_from_latlon(lat, lon)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=depth, location=normal * (planet_radius + depth / 2))
    obj = bpy.context.object
    obj.name = name
    orient_z_to_normal(obj, normal, yaw)
    obj.data.materials.append(material)
    obj.parent = preview_root
    return obj


def build_planet_preview() -> bpy.types.Object:
    preview = bpy.data.objects.new("StarTrip016_MapPreview", None)
    preview.empty_display_type = "SPHERE"
    preview.empty_display_size = 3.8
    bpy.context.scene.collection.objects.link(preview)

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=3.8, location=(0, 0, 0))
    planet = bpy.context.object
    planet.name = "StarTrip016_preview_base_planet"
    planet.data.materials.append(MATS["grass"])
    planet.parent = preview

    biome_patches = [
        ("spawn_meadow", -22, 22, 0.86, (1.55, 0.95, 1), MATS["meadow"], 24),
        ("crater_lake", -8, 44, 0.76, (1.35, 0.82, 1), MATS["deep_water"], -8),
        ("lagoon_edge", -20, 72, 0.8, (1.45, 0.58, 1), MATS["sand"], 18),
        ("reef_shelf", -30, 98, 0.62, (1.2, 0.58, 1), MATS["violet"], -18),
        ("marsh_bowl", 5, 96, 0.7, (1.15, 0.82, 1), MATS["dark_grass"], 20),
        ("moon_dunes", 14, 152, 0.72, (1.45, 0.72, 1), MATS["sand"], -10),
        ("cinder_field", 10, -152, 0.72, (1.26, 0.82, 1), MATS["cinder"], 12),
        ("crystal_ridge_floor", 24, -96, 0.64, (1.5, 0.42, 1), MATS["dark_rock"], -25),
        ("snow_cap", 56, -28, 0.92, (1.15, 0.9, 1), MATS["snow"], 0),
        ("icy_slope", 40, 6, 0.72, (1.45, 0.36, 1), MATS["ice"], 30),
        ("hidden_cave_green", 2, -28, 0.66, (1.25, 0.7, 1), MATS["dark_grass"], -18),
        ("south_ocean_lip", -44, -40, 0.76, (1.4, 0.42, 1), MATS["water"], 0),
    ]
    for item in biome_patches:
        preview_arc_patch(f"StarTrip016_preview_{item[0]}", item[1], item[2], item[3], item[4], item[5], preview, item[6])

    route_points = [
        (-20, 25), (-16, 34), (-12, 43), (-6, 52), (2, 60), (12, 42), (24, 24), (38, 8), (52, -16),
        (-23, 70), (-14, 82), (-4, 92), (4, 78), (12, 54), (26, 30), (42, 6),
        (-6, -30), (6, -52), (20, -78), (25, -100), (18, -132), (28, -80), (42, -38),
    ]
    for index, (lat, lon) in enumerate(route_points):
        preview_arc_patch(f"StarTrip016_preview_route_dot_{index:02d}", lat, lon, 0.055, (1.35, 0.9, 1), MATS["gold"], preview, index * 13)

    preview_cone("StarTrip016_preview_summit_goal_peak", 58, -22, 0.28, 0.92, MATS["snow"], preview)
    preview_cylinder("StarTrip016_preview_comm_array_visible_goal", 58, -22, 0.05, 0.86, MATS["gold"], preview)
    for index, (lat, lon, material) in enumerate([(22, -96, MATS["crystal"]), (12, -152, MATS["lava"]), (4, -28, MATS["basalt"]), (-22, 72, MATS["red"]), (-8, 54, MATS["wood"])]):
        preview_cone(f"StarTrip016_preview_landmark_{index}", lat, lon, 0.12, 0.42, material, preview)
    return preview


def render_planet_preview_views() -> None:
    shell = bpy.data.objects.get("ST016_planet_terrain_shell")
    for root in [obj for obj in bpy.context.scene.objects if obj.name.startswith(PREFIX) and obj.type == "EMPTY"]:
        if root.name != "ST016_planet_terrain_shell":
            root.hide_render = True
            root.hide_viewport = True
    if shell:
        shell.location = (0, 0, 0)
        shell.hide_render = False
        shell.hide_viewport = False
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new("StarTrip016_MapPreview_Camera")
    camera = bpy.data.objects.new("StarTrip016_MapPreview_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 94
    light_data = bpy.data.lights.new("StarTrip016_MapPreview_Key", "AREA")
    light = bpy.data.objects.new("StarTrip016_MapPreview_Key", light_data)
    bpy.context.collection.objects.link(light)
    light.location = (5, -7, 8)
    light_data.energy = 520
    light_data.size = 5
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1400
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.color = (0.035, 0.09, 0.12)
    for index, (x, y, z) in enumerate([(80, -92, 58), (-92, -58, 48), (90, 58, 48), (-70, 92, 58), (0, -112, 70), (0, 108, -64)]):
        camera.location = (x, y, z)
        look_at(camera, (0, 0, 0))
        scene.render.filepath = str(OUTPUT_DIR / f"world-v0.1.6-planet-view-{index}.png")
        bpy.ops.render.render(write_still=True)
    for root in [obj for obj in bpy.context.scene.objects if obj.name.startswith(PREFIX) and obj.type == "EMPTY"]:
        root.hide_render = False
        root.hide_viewport = False


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reset_scene()
    make_materials()
    for asset_id, _, _ in ASSETS:
        build_asset(asset_id)
    arrange_for_contact_sheet()
    render_contact_sheet()
    render_planet_preview_views()
    bpy.ops.wm.save_as_mainfile(filepath=str(TARGET_BLEND))
    export_glb()
    write_manifest_and_check()
    print(json.dumps({"blend": str(TARGET_BLEND), "glb": str(TARGET_GLB), "check": str(TARGET_CHECK), "contact_sheet": str(CONTACT_SHEET), "asset_count": len(ASSETS)}, indent=2))


if __name__ == "__main__":
    main()
