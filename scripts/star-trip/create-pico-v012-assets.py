#!/usr/bin/env python3
"""Create Star Trip Pico v0.1.2 detail assets from the v0.1.1 Blender source.

Run with Blender:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/star-trip/create-pico-v012-assets.py
"""

from __future__ import annotations

import json
import math
import struct
import zlib
from pathlib import Path

import bpy
from mathutils import Vector


REPO = Path(__file__).resolve().parents[2]
ASSET_DIR = REPO / "src/game-center/star-trip/assets/models/characters/pico"
OUTPUT_DIR = REPO / "output/star-trip"
SOURCE_BLEND = ASSET_DIR / "pico-v0.1.1-blockout.blend"
TARGET_BLEND = ASSET_DIR / "pico-v0.1.2-detail.blend"
TARGET_GLB = ASSET_DIR / "pico-v0.1.2-detail.glb"
TARGET_CHECK = ASSET_DIR / "pico-v0.1.2-detail.check.json"
CONTACT_SHEET = OUTPUT_DIR / "pico-v0.1.2-blender-contact-sheet.png"


def rgba(hex_color: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (alpha,)


def ensure_material(name: str, color: str) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = rgba(color)
    return material


def ensure_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    return collection


def link_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    if obj.name not in collection.objects:
        collection.objects.link(obj)
    try:
        bpy.context.scene.collection.objects.unlink(obj)
    except Exception:
        pass


def make_elliptic_band_mesh(
    name: str,
    center: tuple[float, float, float],
    x_radii: list[float],
    y_radii: list[float],
    z_values: list[float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    note: str,
) -> bpy.types.Object:
    sides = 8
    verts: list[tuple[float, float, float]] = []
    for x_radius, y_radius, z in zip(x_radii, y_radii, z_values):
        for i in range(sides):
            angle = math.tau * i / sides + math.pi / 8
            verts.append(
                (
                    center[0] + math.cos(angle) * x_radius,
                    center[1] + math.sin(angle) * y_radius,
                    center[2] + z,
                )
            )

    faces: list[tuple[int, ...]] = [tuple(range(sides - 1, -1, -1))]
    for ring in range(len(z_values) - 1):
        base = ring * sides
        next_base = (ring + 1) * sides
        for i in range(sides):
            faces.append((base + i, base + (i + 1) % sides, next_base + (i + 1) % sides, next_base + i))
    top = (len(z_values) - 1) * sides
    faces.append(tuple(top + i for i in range(sides)))

    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    obj["design_note"] = note
    bpy.context.collection.objects.link(obj)
    link_to_collection(obj, collection)
    return obj


def make_box(
    name: str,
    center: tuple[float, float, float],
    size: tuple[float, float, float],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    note: str,
) -> bpy.types.Object:
    cx, cy, cz = center
    sx, sy, sz = (value / 2 for value in size)
    verts = [
        (cx - sx, cy - sy, cz - sz),
        (cx + sx, cy - sy, cz - sz),
        (cx + sx, cy + sy, cz - sz),
        (cx - sx, cy + sy, cz - sz),
        (cx - sx, cy - sy, cz + sz),
        (cx + sx, cy - sy, cz + sz),
        (cx + sx, cy + sy, cz + sz),
        (cx - sx, cy + sy, cz + sz),
    ]
    faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    obj["design_note"] = note
    bpy.context.collection.objects.link(obj)
    link_to_collection(obj, collection)
    return obj


def make_cylinder_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    sides: int,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    note: str,
) -> bpy.types.Object:
    start_v = Vector(start)
    end_v = Vector(end)
    axis = (end_v - start_v).normalized()
    ref = Vector((0, 0, 1))
    if abs(axis.dot(ref)) > 0.92:
        ref = Vector((1, 0, 0))
    u = axis.cross(ref).normalized()
    v = axis.cross(u).normalized()

    verts: list[tuple[float, float, float]] = []
    for point in (start_v, end_v):
        for i in range(sides):
            angle = math.tau * i / sides
            verts.append(tuple(point + math.cos(angle) * radius * u + math.sin(angle) * radius * v))

    faces: list[tuple[int, ...]] = [tuple(range(sides - 1, -1, -1))]
    for i in range(sides):
        faces.append((i, (i + 1) % sides, sides + (i + 1) % sides, sides + i))
    faces.append(tuple(sides + i for i in range(sides)))

    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    obj["design_note"] = note
    bpy.context.collection.objects.link(obj)
    link_to_collection(obj, collection)
    return obj


def make_tapered_feather_mesh(
    name: str,
    specs: list[tuple[tuple[float, float, float], tuple[float, float, float], float, float, float, float]],
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    note: str,
) -> bpy.types.Object:
    verts: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for center, direction, root_width, _tip_width, thickness, length in specs:
        c = Vector(center)
        d = Vector(direction).normalized()
        side = Vector((1, 0, 0))
        if abs(d.dot(side)) > 0.8:
            side = Vector((0, 1, 0))
        side = d.cross(side).cross(d).normalized()
        normal = d.cross(side).normalized() * thickness
        root_l = c - side * (root_width / 2)
        root_r = c + side * (root_width / 2)
        mid_c = c + d * (length * 0.48)
        mid_l = mid_c - side * (root_width * 0.38)
        mid_r = mid_c + side * (root_width * 0.38)
        tip = c + d * length
        base = len(verts)
        verts.extend(
            [
                tuple(root_l),
                tuple(root_r),
                tuple(mid_r),
                tuple(mid_l),
                tuple(tip),
                tuple(root_l + normal),
                tuple(root_r + normal),
                tuple(tip + normal * 0.45),
            ]
        )
        faces.extend(
            [
                (base, base + 1, base + 2, base + 3),
                (base + 3, base + 2, base + 4),
                (base + 5, base + 7, base + 6),
                (base, base + 5, base + 6, base + 1),
                (base + 1, base + 6, base + 7, base + 4, base + 2),
                (base + 4, base + 7, base + 5, base, base + 3),
            ]
        )

    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    obj["design_note"] = note
    bpy.context.collection.objects.link(obj)
    link_to_collection(obj, collection)
    return obj


def make_triangular_cone(
    name: str,
    base_center: tuple[float, float, float],
    tip: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
    note: str,
) -> bpy.types.Object:
    center = Vector(base_center)
    tip_v = Vector(tip)
    axis = (tip_v - center).normalized()
    ref = Vector((0, 0, 1))
    if abs(axis.dot(ref)) > 0.88:
        ref = Vector((1, 0, 0))
    u = axis.cross(ref).normalized()
    v = axis.cross(u).normalized()
    verts = []
    for i in range(3):
        angle = math.tau * i / 3 + math.pi / 2
        verts.append(tuple(center + math.cos(angle) * radius * u + math.sin(angle) * radius * v))
    verts.append(tuple(tip_v))
    faces = [(0, 2, 1), (0, 1, 3), (1, 2, 3), (2, 0, 3)]
    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    obj["design_note"] = note
    bpy.context.collection.objects.link(obj)
    link_to_collection(obj, collection)
    return obj


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - Vector(obj.location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def create_contact_sheet(render_paths: list[Path]) -> None:
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


def read_png_rgba(path: Path) -> tuple[int, int, bytes]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a PNG: {path}")
    offset = 8
    width = height = bit_depth = color_type = 0
    compressed = bytearray()
    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        chunk_data = data[offset + 8 : offset + 8 + length]
        offset += 12 + length
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _compression, _filter, interlace = struct.unpack(">IIBBBBB", chunk_data)
            if bit_depth != 8 or interlace != 0 or color_type not in {2, 6}:
                raise ValueError(f"Unsupported PNG format: {path}")
        elif chunk_type == b"IDAT":
            compressed.extend(chunk_data)
        elif chunk_type == b"IEND":
            break

    bpp = 4 if color_type == 6 else 3
    raw = zlib.decompress(bytes(compressed))
    stride = width * bpp
    rows: list[bytearray] = []
    pos = 0
    for _y in range(height):
        filter_type = raw[pos]
        pos += 1
        row = bytearray(raw[pos : pos + stride])
        pos += stride
        previous = rows[-1] if rows else bytearray(stride)
        for x in range(stride):
            left = row[x - bpp] if x >= bpp else 0
            up = previous[x]
            up_left = previous[x - bpp] if x >= bpp else 0
            if filter_type == 1:
                row[x] = (row[x] + left) & 0xFF
            elif filter_type == 2:
                row[x] = (row[x] + up) & 0xFF
            elif filter_type == 3:
                row[x] = (row[x] + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                row[x] = (row[x] + paeth(left, up, up_left)) & 0xFF
            elif filter_type != 0:
                raise ValueError(f"Unsupported PNG filter {filter_type}: {path}")
        rows.append(row)

    rgba = bytearray()
    for row in rows:
        if color_type == 6:
            rgba.extend(row)
        else:
            for x in range(0, len(row), 3):
                rgba.extend((row[x], row[x + 1], row[x + 2], 255))
    return width, height, bytes(rgba)


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def write_png_rgba(path: Path, width: int, height: int, pixels: bytes | bytearray) -> None:
    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    scanlines = bytearray()
    stride = width * 4
    for y in range(height):
        scanlines.append(0)
        scanlines.extend(pixels[y * stride : (y + 1) * stride])
    payload = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", payload) + chunk(b"IDAT", zlib.compress(bytes(scanlines))) + chunk(b"IEND", b""))


def assign_foot_materials(foot_material: bpy.types.Material) -> None:
    for name in ("Pico_LegFoot_L_whole_faceted_5bands", "Pico_LegFoot_R_whole_faceted_5bands"):
        obj = bpy.data.objects.get(name)
        if obj is None or obj.type != "MESH":
            continue
        mesh = obj.data
        if foot_material.name not in {material.name for material in mesh.materials}:
            mesh.materials.append(foot_material)
        foot_index = list(mesh.materials).index(foot_material)
        z_values = [vertex.co.z for vertex in mesh.vertices]
        threshold = min(z_values) + (max(z_values) - min(z_values)) * 0.32
        for polygon in mesh.polygons:
            center_z = sum(mesh.vertices[index].co.z for index in polygon.vertices) / len(polygon.vertices)
            if center_z <= threshold:
                polygon.material_index = foot_index


def tune_face_details() -> None:
    beak = bpy.data.objects.get("Pico_Beak_pointed_pyramid_lowered")
    if beak is not None and beak.type == "MESH":
        coords = [vertex.co.copy() for vertex in beak.data.vertices]
        root_y = max(coord.y for coord in coords)
        root_z_values = [coord.z for coord in coords if abs(coord.y - root_y) < 0.001]
        if root_z_values:
            root_center_z = sum(root_z_values) / len(root_z_values)
            for vertex in beak.data.vertices:
                if abs(vertex.co.y - root_y) < 0.001:
                    vertex.co.z = root_center_z + (vertex.co.z - root_center_z) * 1.38
        beak.data.update()
        beak["design_note"] = "Beak root slightly enlarged on Z for a squarer base while preserving pointed pyramid silhouette."

    for name in (
        "Pico_Eye_L_true_side_disc_white",
        "Pico_Eye_R_true_side_disc_white",
        "Pico_Eye_L_true_side_disc_pupil",
        "Pico_Eye_R_true_side_disc_pupil",
    ):
        eye = bpy.data.objects.get(name)
        if eye is None or eye.type != "MESH":
            continue
        center = eye.location.copy()
        scale = 1.08 if name.endswith("_white") else 1.07
        for vertex in eye.data.vertices:
            world = eye.matrix_world @ vertex.co
            world.y = center.y + (world.y - center.y) * scale
            world.z = center.z + (world.z - center.z) * scale
            vertex.co = eye.matrix_world.inverted() @ world
        eye.location.y -= 0.025
        eye.data.update()
        eye["design_note"] = "Eye disc slightly enlarged and moved forward along character front (-Y)."


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))

    materials = {
        "feather": ensure_material("Pico_Feather_Indigo", "#0E5EA8"),
        "limb": ensure_material("Pico_Mat_Limb_Indigo", "#1679C4"),
        "body": ensure_material("Pico_Body_Tunic_Blue", "#C7B7FF"),
        "hem": ensure_material("Pico_Body_Tunic_Light_Blue_Hem", "#FF6F9F"),
        "beak": ensure_material("Pico_Beak_Gold", "#FFC21F"),
        "eye_white": ensure_material("Pico_Eye_White", "#FFF7EB"),
        "eye_black": ensure_material("Pico_Eye_Black", "#050506"),
        "foot": ensure_material("Pico_Foot_OrangeYellow", "#E7A33A"),
        "pack": ensure_material("Pico_Jetpack_BlueGray", "#7F9AA3"),
        "nozzle": ensure_material("Pico_Jetpack_Nozzle_Dark", "#202C35"),
    }
    assign_foot_materials(materials["foot"])
    tune_face_details()

    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith(("Pico_Jetpack_", "Pico_Tail_", "Pico_Crest_Back_Tuft_")):
            bpy.data.objects.remove(obj, do_unlink=True)

    collection = ensure_collection("Character_Pico_Blockout")

    make_elliptic_band_mesh(
        "Pico_Jetpack_Main_shell_lowpoly",
        (0.0, 0.23, 1.03),
        [0.11, 0.165, 0.18, 0.165, 0.11],
        [0.05, 0.075, 0.088, 0.075, 0.05],
        [-0.24, -0.13, 0.02, 0.15, 0.24],
        materials["pack"],
        collection,
        "v0.1.2 compact grey-blue jetpack shell, shortened on Z and slightly intersecting Pico back (+Y) to read as attached.",
    )
    make_cylinder_between(
        "Pico_Jetpack_Nozzle_L",
        (-0.068, 0.28, 0.82),
        (-0.068, 0.34, 0.69),
        0.045,
        6,
        materials["nozzle"],
        collection,
        "Left low-poly jet nozzle; runtime flame should align near this object.",
    )
    make_cylinder_between(
        "Pico_Jetpack_Nozzle_R",
        (0.068, 0.28, 0.82),
        (0.068, 0.34, 0.69),
        0.045,
        6,
        materials["nozzle"],
        collection,
        "Right low-poly jet nozzle; runtime flame should align near this object.",
    )
    make_tapered_feather_mesh(
        "Pico_Tail_Upturned_3feather",
        [
            ((-0.052, 0.205, 0.53), (-0.16, 0.28, -0.64), 0.075, 0.022, 0.02, 0.25),
            ((0.0, 0.218, 0.525), (0.0, 0.32, -0.76), 0.085, 0.026, 0.022, 0.29),
            ((0.052, 0.205, 0.53), (0.16, 0.28, -0.64), 0.075, 0.022, 0.02, 0.25),
        ],
        materials["limb"],
        collection,
        "Lower downturned three-feather bird tail on back lower torso, kept below jetpack flame path.",
    )

    crest_specs = [
        ("Pico_Crest_Back_Tuft_01", (0.0, 0.05, 2.025), (0.0, 0.0663, 2.2428), 0.078),
        ("Pico_Crest_Back_Tuft_02", (0.0, 0.19, 1.985), (0.0, 0.3005, 2.1898), 0.085),
        ("Pico_Crest_Back_Tuft_03", (0.0, 0.31, 1.915), (0.0, 0.4595, 2.0418), 0.072),
    ]
    for name, base_center, tip, radius in crest_specs:
        make_triangular_cone(
            name,
            base_center,
            tip,
            radius,
            materials["feather"],
            collection,
            "v0.1.2 triangular cone mohawk tuft, aligned on the head centerline and shifted toward the rear silhouette.",
        )

    bpy.ops.wm.save_as_mainfile(filepath=str(TARGET_BLEND))

    bpy.ops.object.select_all(action="DESELECT")
    export_objects = [obj for obj in bpy.context.scene.objects if obj.name.startswith("Pico_") and obj.type in {"MESH", "ARMATURE"}]
    for obj in export_objects:
        obj.select_set(True)
    if export_objects:
        bpy.context.view_layer.objects.active = export_objects[0]
    bpy.ops.export_scene.gltf(filepath=str(TARGET_GLB), export_format="GLB", use_selection=True, export_apply=True, export_yup=True)

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

    render_paths = []
    for label, location in [("front", (0, -4.3, 1.25)), ("side", (4.2, 0.1, 1.25)), ("back", (0, 4.3, 1.25))]:
        camera.location = location
        look_at(camera, (0, 0.12, 1.15))
        path = OUTPUT_DIR / f"pico-v0.1.2-blender-{label}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        render_paths.append(path)
    create_contact_sheet(render_paths)

    required_new = [
        "Pico_Jetpack_Main_shell_lowpoly",
        "Pico_Jetpack_Nozzle_L",
        "Pico_Jetpack_Nozzle_R",
        "Pico_Tail_Upturned_3feather",
        "Pico_Crest_Back_Tuft_01",
        "Pico_Crest_Back_Tuft_02",
        "Pico_Crest_Back_Tuft_03",
    ]
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
        "blend": str(TARGET_BLEND),
        "glb": str(TARGET_GLB),
        "export_scope": "Selected objects whose names start with Pico_ and type is MESH or ARMATURE.",
        "object_count": len(export_objects),
        "mesh_count": sum(1 for obj in export_objects if obj.type == "MESH"),
        "armature_count": sum(1 for obj in export_objects if obj.type == "ARMATURE"),
        "materials": sorted({material.name for obj in export_objects for material in getattr(obj.data, "materials", [])}),
        "required_new_objects": {name: bpy.data.objects.get(name) is not None for name in required_new},
        "stale_objects": stale,
        "objects": objects,
        "visual_artifacts": {
            "contact_sheet": str(CONTACT_SHEET),
            "front": str(render_paths[0]),
            "side": str(render_paths[1]),
            "back": str(render_paths[2]),
        },
        "notes": [
            "v0.1.2 detail pass makes Pico bluer and adds jetpack, tail, and three rear crest tufts.",
            "Red scarf intentionally omitted for this version.",
            "Existing core object names are preserved for runtime pivots.",
        ],
    }
    TARGET_CHECK.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"blend": str(TARGET_BLEND), "glb": str(TARGET_GLB), "check": str(TARGET_CHECK), "contact_sheet": str(CONTACT_SHEET)}, indent=2))


if __name__ == "__main__":
    main()
