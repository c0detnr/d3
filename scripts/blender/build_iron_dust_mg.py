import bpy
import bmesh
import math
import os
from mathutils import Vector

ROOT = "/home/mami/Projects/d3"
ASSET_DIR = os.path.join(ROOT, "assets/weapons/iron_dust_mg_01")
PREVIEW_DIR = os.path.join(ASSET_DIR, "previews")
BLEND_PATH = os.path.join(ASSET_DIR, "iron_dust_mg_01.blend")
GLB_PATH = os.path.join(ASSET_DIR, "iron_dust_mg_01.glb")
TANK_BLEND = os.path.join(ROOT, "assets/tanks/iron_dust_01/iron_dust_01.blend")
MOUNT = Vector((0.95, 0.55, 2.72))

os.makedirs(PREVIEW_DIR, exist_ok=True)

MATS = {}


def make_mat(name, color, metallic, roughness, emission=None, emission_strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = color
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    if emission is not None:
        if "Emission Color" in b.inputs:
            b.inputs["Emission Color"].default_value = emission
        if "Emission Strength" in b.inputs:
            b.inputs["Emission Strength"].default_value = emission_strength
    m.diffuse_color = color
    MATS[name] = m
    return m


def build_materials():
    make_mat("MG_Armor_Olive", (0.051, 0.070, 0.054, 1), 0.25, 0.68)
    make_mat("MG_Armor_Secondary", (0.223, 0.235, 0.178, 1), 0.22, 0.70)
    make_mat("MG_Graphite", (0.034, 0.040, 0.044, 1), 0.55, 0.60)
    make_mat("MG_Steel", (0.122, 0.141, 0.136, 1), 0.72, 0.42)
    make_mat("MG_Steel_Worn", (0.205, 0.220, 0.210, 1), 0.85, 0.32)
    make_mat("MG_Recess", (0.005, 0.009, 0.010, 1), 0.15, 0.78)
    make_mat("MG_Rubber", (0.012, 0.014, 0.015, 1), 0.0, 0.88)
    make_mat("MG_Dust", (0.665, 0.571, 0.407, 1), 0.05, 0.76)
    make_mat("MG_Brass", (0.434, 0.254, 0.068, 1), 0.88, 0.28)
    make_mat("MG_Copper", (0.400, 0.160, 0.070, 1), 0.90, 0.34)
    make_mat("MG_Optics_Teal", (0.031, 0.105, 0.120, 1), 0.50, 0.20,
             (0.031, 0.105, 0.120, 1), 0.35)
    make_mat("MG_Studio_Sand", (0.078, 0.080, 0.067, 1), 0.0, 0.95)


def obj_from_bm(name, bm, mat, col, smooth=0.0):
    bm.normal_update()
    if smooth > 0:
        for f in bm.faces:
            f.smooth = True
        for e in bm.edges:
            if len(e.link_faces) != 2:
                e.smooth = False
            else:
                try:
                    if e.calc_face_angle(0.0) > smooth:
                        e.smooth = False
                except ValueError:
                    e.smooth = False
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    me.materials.append(mat)
    ob["asset_node_id"] = name
    return ob


def box(name, size, loc, mat, col, rot=(0, 0, 0), bevel=0.007, segments=1):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segments,
                        affect="EDGES", clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bm(name, bm, mat, col)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def cyl(name, radius, depth, loc, mat, col, axis="Z", verts=20, radius2=None,
        rot_extra=(0, 0, 0), smooth=0.62, bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                          radius1=radius, radius2=(radius if radius2 is None else radius2),
                          depth=depth)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1,
                        affect="EDGES", clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bm(name, bm, mat, col, smooth=smooth)
    if axis == "X":
        ob.rotation_euler = (0, math.pi / 2, 0)
    elif axis == "Y":
        ob.rotation_euler = (math.pi / 2, 0, 0)
    ob.rotation_euler = tuple(a + b for a, b in zip(ob.rotation_euler, rot_extra))
    ob.location = loc
    return ob


def tube(name, r_out, r_in, depth, loc, mat, col, verts=24, axis="Z", smooth=0.62):
    bm = bmesh.new()
    ring_lo = []
    ring_hi = []
    for i in range(verts):
        a = 2 * math.pi * i / verts
        c, s = math.cos(a), math.sin(a)
        ring_lo.append((bm.verts.new((r_out * c, r_out * s, -depth / 2)),
                        bm.verts.new((r_in * c, r_in * s, -depth / 2))))
        ring_hi.append((bm.verts.new((r_out * c, r_out * s, depth / 2)),
                        bm.verts.new((r_in * c, r_in * s, depth / 2))))
    for i in range(verts):
        j = (i + 1) % verts
        bm.faces.new((ring_lo[i][0], ring_lo[j][0], ring_hi[j][0], ring_hi[i][0]))
        bm.faces.new((ring_lo[i][1], ring_hi[i][1], ring_hi[j][1], ring_lo[j][1]))
        bm.faces.new((ring_hi[i][0], ring_hi[i][1], ring_hi[j][1], ring_hi[j][0]))
        bm.faces.new((ring_lo[i][0], ring_lo[j][0], ring_lo[j][1], ring_lo[i][1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bm(name, bm, mat, col, smooth=smooth)
    if axis == "X":
        ob.rotation_euler = (0, math.pi / 2, 0)
    elif axis == "Y":
        ob.rotation_euler = (math.pi / 2, 0, 0)
    ob.location = loc
    return ob


def sphere(name, radius, loc, mat, col, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=radius)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = obj_from_bm(name, bm, mat, col, smooth=0.62)
    ob.location = loc
    return ob


def rod(name, a, b, radius, mat, col, verts=12):
    a, b = Vector(a), Vector(b)
    d = b - a
    ob = cyl(name, radius, d.length, (a + b) / 2, mat, col, axis="Z",
             verts=verts, smooth=0.62)
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = d.to_track_quat("Z", "Y")
    return ob


def empty(name, loc, col, parent=None, kind="PLAIN_AXES", size=0.12):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = kind
    ob.empty_display_size = size
    col.objects.link(ob)
    ob["asset_node_id"] = name
    if parent:
        ob.parent = parent
    ob.location = loc
    return ob


def parent_keep(child, parent):
    mw = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    child.matrix_world = mw


def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def add_area_light(name, loc, energy, size, color, col, target=(0, 0, 0)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    ob = bpy.data.objects.new(name, data)
    col.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    return ob


def add_camera(name, loc, target, lens, col, ortho=None):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    if ortho:
        data.type = "ORTHO"
        data.ortho_scale = ortho
    ob = bpy.data.objects.new(name, data)
    col.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    return ob


def build_asset(scene, col):
    m_olive = MATS["MG_Armor_Olive"]
    m_sec = MATS["MG_Armor_Secondary"]
    m_graph = MATS["MG_Graphite"]
    m_steel = MATS["MG_Steel"]
    m_worn = MATS["MG_Steel_Worn"]
    m_recess = MATS["MG_Recess"]
    m_rubber = MATS["MG_Rubber"]
    m_dust = MATS["MG_Dust"]
    m_brass = MATS["MG_Brass"]
    m_copper = MATS["MG_Copper"]
    m_teal = MATS["MG_Optics_Teal"]

    root = empty("MG_Root", (0, 0, 0), col, kind="ARROWS", size=0.22)
    root["asset_node_id"] = "MG_Root"
    root["weapon_name"] = "ID-MG12 Kirik Cene"
    root["caliber_mm"] = 12.7
    root["role"] = "commander_pintle_hmg"
    root["mount_local"] = "0.95, 0.55, 2.72"
    root["forward_axis"] = "-Y"
    empty("MG_MountPoint", (0, 0, 0), col, parent=root, kind="CUBE", size=0.05)

    mount = empty("MG_Mount", (0, 0, 0), col, parent=root, kind="PLAIN_AXES", size=0.09)
    cyl("MG_Mount_AdapterPlate", 0.155, 0.026, (0, 0, 0.013), m_graph, col, verts=24, smooth=0.0, bevel=0.003)
    for i, (x, y) in enumerate([(0.108, 0.0), (-0.108, 0.0), (0.0, 0.108), (0.0, -0.108)]):
        cyl(f"MG_Mount_AdapterBolt_{i+1}", 0.012, 0.012, (x, y, 0.030), m_steel, col, verts=6, smooth=0.0, bevel=0.0015)
    tube("MG_Mount_TraverseRing", 0.125, 0.088, 0.052, (0, 0, 0.052), m_olive, col, verts=32)
    for i in range(10):
        a = 2 * math.pi * i / 10
        box(f"MG_Mount_RingTooth_{i+1}", (0.019, 0.014, 0.018),
            (0.129 * math.cos(a), 0.129 * math.sin(a), 0.052), m_steel, col,
            rot=(0, 0, a), bevel=0.002)
    box("MG_Mount_LockLever", (0.075, 0.018, 0.018), (0.135, 0.018, 0.082), m_worn, col,
        rot=(0, 0, 0.32), bevel=0.002)
    box("MG_Mount_LockLeverTip", (0.022, 0.022, 0.022), (0.166, 0.041, 0.082), m_dust, col,
        rot=(0, 0, 0.32), bevel=0.002)
    cyl("MG_Mount_Pedestal", 0.089, 0.115, (0, 0, 0.140), m_graph, col, verts=8, radius2=0.066, smooth=0.0)
    cyl("MG_Mount_PedestalCollar", 0.094, 0.014, (0, 0, 0.201), m_steel, col, verts=24, bevel=0.002)
    for i, (x, y) in enumerate([(0.065, 0.065), (-0.065, 0.065), (0.065, -0.065), (-0.065, -0.065)]):
        box(f"MG_Mount_PedestalRib_{i+1}", (0.016, 0.016, 0.085), (x, y, 0.145), m_steel, col, bevel=0.002)
    box("MG_Mount_DataPlate", (0.001, 0.045, 0.018), (0.0, 0.093, 0.135), m_dust, col, bevel=0.0)

    yaw = empty("MG_YawPivot", (0, 0, 0.205), col, parent=root, kind="SINGLE_ARROW", size=0.18)
    for side, sx in (("L", -1), ("R", 1)):
        box(f"MG_Yoke_{side}", (0.030, 0.092, 0.252), (sx * 0.095, 0.0, 0.331), m_olive, col, bevel=0.006)
        cyl(f"MG_Yoke_HoleRing_{side}", 0.027, 0.006, (sx * 0.1115, 0.0, 0.345), m_steel, col, axis="X", bevel=0.0015)
        cyl(f"MG_Yoke_Hole_{side}", 0.021, 0.004, (sx * 0.1145, 0.0, 0.345), m_recess, col, axis="X", smooth=0.0)
        cyl(f"MG_Yoke_HoleBolt_{side}", 0.008, 0.008, (sx * 0.117, 0.0, 0.345), m_worn, col, axis="X", verts=6, smooth=0.0)
        cyl(f"MG_Trunnion_{side}", 0.030, 0.026, (sx * 0.126, 0.0, 0.462), m_steel, col, axis="X", verts=18)
        cyl(f"MG_TrunnionNut_{side}", 0.018, 0.014, (sx * 0.145, 0.0, 0.462), m_worn, col, axis="X", verts=6, smooth=0.0)
    box("MG_Yoke_Crossbar", (0.19, 0.072, 0.040), (0.0, 0.0, 0.218), m_graph, col, bevel=0.005)
    box("MG_Yoke_StopLug", (0.040, 0.030, 0.028), (0.0, -0.055, 0.230), m_steel, col, bevel=0.003)

    pitch = empty("MG_PitchPivot", (0, 0, 0.257), col, parent=yaw, kind="SINGLE_ARROW", size=0.16)

    rec = empty("MG_Receiver", (0, 0, 0), col, parent=pitch, kind="PLAIN_AXES", size=0.10)
    box("MG_Receiver_Body", (0.150, 0.720, 0.196), (0, 0.010, 0), m_graph, col, bevel=0.011)
    box("MG_Receiver_UpperSpine", (0.128, 0.700, 0.034), (0, 0.010, 0.104), m_graph, col, bevel=0.006)
    for side, sx in (("L", -1), ("R", 1)):
        box(f"MG_Receiver_SidePlate_{side}", (0.006, 0.470, 0.120), (sx * 0.077, 0.045, 0.002), m_graph, col, bevel=0.002)
        for i, yy in enumerate((0.160, 0.045, -0.070)):
            cyl(f"MG_Receiver_SideBolt_{side}_{i+1}", 0.007, 0.005, (sx * 0.081, yy, 0.050), m_worn, col, axis="X", verts=6, smooth=0.0)
        box(f"MG_Receiver_Rib_{side}", (0.007, 0.330, 0.016), (sx * 0.078, 0.065, -0.070), m_steel, col, bevel=0.002)
    box("MG_Receiver_TopCover", (0.154, 0.384, 0.052), (0, 0.050, 0.128), m_graph, col, bevel=0.008)
    box("MG_Receiver_CoverRidge", (0.148, 0.060, 0.012), (0, -0.010, 0.158), m_steel, col, bevel=0.002)
    cyl("MG_Receiver_CoverHinge", 0.014, 0.160, (0, -0.146, 0.108), m_steel, col, axis="X", verts=14)
    box("MG_Receiver_FeedFrame", (0.108, 0.206, 0.006), (-0.020, 0.062, 0.154), m_sec, col, bevel=0.002)
    box("MG_Receiver_FeedRecess", (0.080, 0.176, 0.004), (-0.020, 0.062, 0.158), m_recess, col, bevel=0.001)
    for i, yy in enumerate((-0.030, 0.180)):
        box(f"MG_Receiver_CoverLatch_{i+1}", (0.014, 0.032, 0.022), (0.082, yy, 0.132), m_worn, col, bevel=0.002)
    box("MG_Receiver_EjectionPort", (0.007, 0.166, 0.072), (0.0785, 0.058, -0.018), m_recess, col, bevel=0.002)
    box("MG_Receiver_EjectDeflector", (0.026, 0.104, 0.010), (0.088, 0.052, -0.060), m_steel, col,
        rot=(0.0, -0.55, 0.0), bevel=0.002)
    box("MG_Receiver_EjectFrameTop", (0.010, 0.178, 0.010), (0.079, 0.058, 0.024), m_steel, col, bevel=0.0015)
    box("MG_Receiver_EjectFrameBottom", (0.010, 0.178, 0.010), (0.079, 0.058, -0.060), m_steel, col, bevel=0.0015)
    box("MG_Receiver_ChargingSlot", (0.006, 0.150, 0.020), (0.0775, 0.245, 0.030), m_recess, col, bevel=0.001)
    rod("MG_Receiver_ChargingHandle", (0.083, 0.185, 0.030), (0.106, 0.300, 0.030), 0.011, m_worn, col, verts=10)
    sphere("MG_Receiver_ChargingKnob", 0.019, (0.108, 0.312, 0.030), m_graph, col, scale=(1, 1.35, 1))
    box("MG_Receiver_SerialPlate", (0.0015, 0.078, 0.028), (0.0798, 0.300, -0.058), m_dust, col, bevel=0.0)
    for i in range(3):
        box(f"MG_Receiver_SerialMark_{i+1}", (0.001, 0.012, 0.010),
            (0.0806, 0.276 + i * 0.020, -0.058), m_recess, col, bevel=0.0)
    box("MG_Receiver_RearPlate", (0.162, 0.038, 0.200), (0, 0.381, 0), m_graph, col, bevel=0.006)
    for sx in (-1, 1):
        cyl(f"MG_Receiver_RearBolt_{'L' if sx < 0 else 'R'}", 0.010, 0.006, (sx * 0.056, 0.401, 0.062), m_worn, col, axis="Y", verts=6, smooth=0.0)
    tube("MG_Receiver_SlingLoop", 0.017, 0.011, 0.008, (-0.084, 0.300, -0.070), m_steel, col, verts=16, axis="X")
    box("MG_Receiver_RailBase", (0.050, 0.340, 0.012), (0, 0.020, 0.164), m_graph, col, bevel=0.002)
    for i in range(7):
        box(f"MG_Receiver_RailTooth_{i+1}", (0.052, 0.008, 0.008), (0, -0.110 + i * 0.044, 0.173), m_steel, col, bevel=0.001)
    box("MG_Receiver_RearSightBase", (0.048, 0.052, 0.016), (0, 0.300, 0.172), m_steel, col, bevel=0.002)
    box("MG_Receiver_RearSightPost", (0.010, 0.012, 0.062), (0, 0.300, 0.208), m_graph, col, bevel=0.0015)
    tube("MG_Receiver_RearSightAperture", 0.018, 0.009, 0.010, (0, 0.300, 0.243), m_steel, col, verts=16, axis="Y")
    for sx in (-1, 1):
        box(f"MG_Receiver_RearSightEar_{'L' if sx < 0 else 'R'}", (0.008, 0.030, 0.052),
            (sx * 0.024, 0.300, 0.215), m_graph, col, bevel=0.0015)

    optic = empty("MG_OpticGroup", (0, 0, 0), col, parent=pitch, kind="PLAIN_AXES", size=0.08)
    box("MG_Optic_Mount", (0.052, 0.112, 0.026), (0, -0.018, 0.190), m_graph, col, bevel=0.004)
    box("MG_Optic_Body", (0.064, 0.146, 0.076), (0, -0.042, 0.238), m_olive, col, bevel=0.008)
    box("MG_Optic_Hood", (0.072, 0.040, 0.060), (0, -0.118, 0.241), m_graph, col, bevel=0.005)
    cyl("MG_Optic_ObjectiveRing", 0.027, 0.012, (0, -0.141, 0.241), m_steel, col, axis="Y", verts=24, bevel=0.0015)
    cyl("MG_Optic_ObjectiveGlass", 0.022, 0.006, (0, -0.148, 0.241), m_teal, col, axis="Y", verts=24, smooth=0.5)
    tube("MG_Optic_EyepieceRing", 0.024, 0.016, 0.014, (0, 0.036, 0.238), m_graph, col, verts=24, axis="Y")
    cyl("MG_Optic_EyepieceGlass", 0.015, 0.005, (0, 0.043, 0.238), m_teal, col, axis="Y", verts=24, smooth=0.5)
    for i, (x, y) in enumerate([(0.0, -0.070), (0.0, -0.005)]):
        cyl(f"MG_Optic_Turret_{i+1}", 0.012, 0.018, (x, y, 0.281), m_steel, col, verts=14, bevel=0.0015)
    cyl("MG_Optic_SideKnob", 0.014, 0.016, (0.038, -0.040, 0.238), m_worn, col, axis="X", verts=14)
    for sx in (-1, 1):
        box(f"MG_Optic_Ear_{'L' if sx < 0 else 'R'}", (0.007, 0.052, 0.050),
            (sx * 0.039, -0.112, 0.242), m_olive, col, bevel=0.002)
    box("MG_Optic_CableClamp", (0.012, 0.030, 0.014), (0.030, 0.000, 0.192), m_steel, col, bevel=0.0015)

    grip = empty("MG_GripGroup", (0, 0, 0), col, parent=pitch, kind="PLAIN_AXES", size=0.07)
    box("MG_Grip_TriggerHousing", (0.108, 0.160, 0.058), (0, 0.288, -0.112), m_graph, col, bevel=0.006)
    for side, sx in (("L", -1), ("R", 1)):
        rod(f"MG_Grip_Arm_{side}", (sx * 0.062, 0.352, -0.070), (sx * 0.100, 0.492, -0.126), 0.011, m_steel, col, verts=10)
        rod(f"MG_Grip_Sleeve_{side}", (sx * 0.086, 0.432, -0.105), (sx * 0.112, 0.520, -0.140), 0.022, m_rubber, col, verts=12)
        sphere(f"MG_Grip_EndCap_{side}", 0.025, (sx * 0.115, 0.528, -0.143), m_graph, col, scale=(1, 1.25, 1))
        rod(f"MG_Grip_ThumbLever_{side}", (sx * 0.090, 0.415, -0.092), (sx * 0.078, 0.440, -0.060), 0.005, m_worn, col, verts=8)
    box("MG_Grip_Butterfly", (0.058, 0.012, 0.070), (0, 0.370, -0.090), m_worn, col, rot=(0.38, 0, 0), bevel=0.003)
    box("MG_Grip_TriggerGuardTop", (0.070, 0.120, 0.010), (0, 0.320, -0.132), m_steel, col, bevel=0.002)
    for sx in (-1, 1):
        box(f"MG_Grip_TriggerGuardSide_{'L' if sx < 0 else 'R'}", (0.008, 0.010, 0.052),
            (sx * 0.032, 0.362, -0.158), m_steel, col, bevel=0.0015)
    box("MG_Grip_TriggerGuardBottom", (0.070, 0.100, 0.010), (0, 0.365, -0.182), m_steel, col, bevel=0.002)
    box("MG_Grip_AmmoRelease", (0.024, 0.020, 0.030), (-0.055, 0.255, -0.132), m_worn, col, bevel=0.002)
    box("MG_Grip_SafetyLever", (0.018, 0.044, 0.014), (0.062, 0.255, -0.090), m_worn, col, rot=(0.0, 0.0, 0.25), bevel=0.002)

    barrel = empty("MG_BarrelGroup", (0, 0, 0), col, parent=pitch, kind="PLAIN_AXES", size=0.09)
    cyl("MG_Barrel_QuickCollar", 0.055, 0.046, (0, -0.370, 0), m_steel, col, axis="Y", verts=20, bevel=0.002)
    box("MG_Barrel_QCLever", (0.020, 0.034, 0.070), (0.060, -0.370, -0.008), m_worn, col, rot=(0.25, 0, 0), bevel=0.003)
    tube("MG_Barrel_Shroud", 0.058, 0.046, 0.330, (0, -0.545, 0), m_graph, col, verts=24, axis="Y")
    for i, yy in enumerate((-0.430, -0.545, -0.660)):
        tube(f"MG_Barrel_ShroudBand_{i+1}", 0.062, 0.052, 0.018, (0, yy, 0), m_steel, col, verts=24, axis="Y")
    for sy in (-1, 1):
        box(f"MG_Barrel_ShroudVentUpper_{'T' if sy > 0 else 'B'}",
            (0.070, 0.180, 0.006), (0, -0.545, sy * 0.054), m_recess, col, bevel=0.001)
        box(f"MG_Barrel_ShroudVentSide_{'L' if sy < 0 else 'R'}",
            (0.006, 0.180, 0.040), (sy * 0.056, -0.545, 0), m_recess, col, bevel=0.001)
    cyl("MG_Barrel_Tube", 0.044, 0.940, (0, -0.840, 0), m_graph, col, axis="Y", verts=20,
        radius2=0.029, smooth=0.62)
    for i, yy in enumerate((-0.585, -0.800, -1.055)):
        cyl(f"MG_Barrel_HeatRing_{i+1}", 0.047, 0.020, (0, yy, 0), m_steel, col, axis="Y", verts=20)
    box("MG_Barrel_CarryBase", (0.034, 0.090, 0.016), (0, -0.470, 0.058), m_steel, col, bevel=0.002)
    box("MG_Barrel_CarryHandle", (0.024, 0.104, 0.014), (0, -0.470, 0.096), m_graph, col, bevel=0.003)
    for sy in (-1, 1):
        box(f"MG_Barrel_CarryPost_{'L' if sy < 0 else 'R'}", (0.012, 0.014, 0.036),
            (sy * 0.024, -0.430, 0.076), m_steel, col, bevel=0.0015)
    box("MG_Barrel_GasBlock", (0.070, 0.098, 0.060), (0, -0.742, -0.040), m_steel, col, bevel=0.005)
    cyl("MG_Barrel_GasTube", 0.011, 0.290, (0, -0.600, -0.060), m_graph, col, axis="Y", verts=12)
    box("MG_Barrel_GasAdjust", (0.028, 0.030, 0.020), (0.046, -0.742, -0.040), m_worn, col, bevel=0.002)
    for sy in (-1, 1):
        box(f"MG_Barrel_SightBase_{'L' if sy < 0 else 'R'}", (0.020, 0.030, 0.014),
            (sy * 0.020, -1.180, 0.052), m_steel, col, bevel=0.002)
    box("MG_Barrel_FrontSightPost", (0.009, 0.012, 0.050), (0, -1.180, 0.084), m_graph, col, bevel=0.0015)
    for sx in (-1, 1):
        box(f"MG_Barrel_FrontSightEar_{'L' if sx < 0 else 'R'}", (0.007, 0.036, 0.056),
            (sx * 0.022, -1.180, 0.082), m_steel, col, rot=(0, sx * 0.10, 0), bevel=0.0015)
    cyl("MG_Muzzle_Core", 0.028, 0.190, (0, -1.360, 0), m_graph, col, axis="Y", verts=16)
    for i, yy in enumerate((-1.300, -1.362, -1.424)):
        tube(f"MG_Muzzle_Baffle_{i+1}", 0.058, 0.028, 0.030, (0, yy, 0), m_steel, col, verts=20, axis="Y")
        for sx in (-1, 1):
            box(f"MG_Muzzle_Port_{i+1}_{'L' if sx < 0 else 'R'}", (0.010, 0.014, 0.062),
                (sx * 0.052, yy, 0), m_recess, col, bevel=0.001)
    cyl("MG_Muzzle_FrontCap", 0.050, 0.016, (0, -1.470, 0), m_steel, col, axis="Y", verts=20, bevel=0.002)
    cyl("MG_Muzzle_Bore", 0.016, 0.006, (0, -1.480, 0), m_recess, col, axis="Y", verts=16, smooth=0.0)
    empty("MG_MuzzlePoint", (0, -1.500, 0.0), col, parent=barrel, kind="CUBE", size=0.035)

    feed = empty("MG_FeedGroup", (0, 0, 0), col, parent=pitch, kind="PLAIN_AXES", size=0.09)
    box("MG_Ammo_Can", (0.170, 0.300, 0.216), (-0.255, 0.060, -0.098), m_olive, col, bevel=0.010)
    box("MG_Ammo_Lid", (0.178, 0.308, 0.024), (-0.255, 0.060, 0.020), m_sec, col, bevel=0.006)
    cyl("MG_Ammo_LidHinge", 0.010, 0.176, (-0.255, 0.208, 0.024), m_steel, col, axis="X", verts=12)
    for i, sx in enumerate((-1, 1)):
        box(f"MG_Ammo_Latch_{i+1}", (0.020, 0.026, 0.034), (-0.255 + sx * 0.070, -0.082, 0.016), m_worn, col, bevel=0.002)
    rod("MG_Ammo_Handle", (-0.343, -0.030, -0.058), (-0.343, 0.120, -0.058), 0.010, m_steel, col, verts=10)
    for sy in (-1, 1):
        box(f"MG_Ammo_HandlePost_{'F' if sy < 0 else 'R'}", (0.010, 0.014, 0.040),
            (-0.343, 0.045 + sy * 0.075, -0.078), m_steel, col, bevel=0.0015)
    for i, yy in enumerate((-0.040, 0.060, 0.160)):
        box(f"MG_Ammo_Rib_{i+1}", (0.008, 0.014, 0.168), (-0.343, yy, -0.098), m_sec, col, bevel=0.002)
    box("MG_Ammo_FeedOpening", (0.074, 0.070, 0.006), (-0.198, -0.060, 0.033), m_recess, col, bevel=0.001)
    box("MG_Ammo_Label", (0.0015, 0.090, 0.034), (-0.3415, -0.070, -0.140), m_dust, col, bevel=0.0)
    for i in range(3):
        box(f"MG_Ammo_LabelMark_{i+1}", (0.001, 0.014, 0.008),
            (-0.3425, -0.098 + i * 0.020, -0.128), m_recess, col, bevel=0.0)
    box("MG_Ammo_Bracket", (0.100, 0.062, 0.042), (-0.158, 0.025, 0.000), m_steel, col, bevel=0.003)
    box("MG_Ammo_Strap", (0.040, 0.016, 0.070), (-0.176, 0.190, 0.022), m_steel, col, bevel=0.002)

    belt_points = [
        (-0.130, 0.226, 0.021), (-0.130, 0.196, 0.051), (-0.130, 0.166, 0.082),
        (-0.130, 0.136, 0.108), (-0.130, 0.108, 0.129), (-0.130, 0.083, 0.143),
        (-0.130, 0.060, 0.152),
    ]
    for i, p in enumerate(belt_points):
        cyl(f"MG_Belt_Case_{i+1}", 0.0088, 0.076, (p[0], p[1], p[2]), m_brass, col,
            axis="X", verts=12, smooth=0.6)
        cyl(f"MG_Belt_Bullet_{i+1}", 0.0072, 0.026, (p[0] - 0.050, p[1], p[2]), m_copper, col,
            axis="X", verts=10, radius2=0.0035, smooth=0.6)
        if i < len(belt_points) - 1:
            q = belt_points[i + 1]
            mid = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2)
            box(f"MG_Belt_Link_{i+1}", (0.030, 0.015, 0.007), mid, m_graph, col,
                rot=(math.atan2(q[2] - p[2], q[1] - p[1]), 0, 0), bevel=0.001)
    box("MG_Brass_CatchBag", (0.078, 0.132, 0.142), (0.112, 0.035, -0.132), m_dust, col,
        rot=(0.0, 0.12, 0.0), bevel=0.012)
    box("MG_Brass_BagHanger", (0.018, 0.104, 0.012), (0.086, 0.035, -0.056), m_steel, col, bevel=0.002)
    box("MG_Brass_BagStrap", (0.010, 0.020, 0.058), (0.076, 0.095, -0.086), m_steel, col, bevel=0.002)

    empty("MG_POVPoint", (0.100, 0.800, 0.495), col, parent=yaw, kind="CUBE", size=0.05)

    return root, mount, yaw, pitch, rec, grip, barrel, feed, optic


def build_standalone(scene, col):
    ground = box("MG_Studio_Ground", (24, 24, 0.06), (0, 0, -0.06), MATS["MG_Studio_Sand"], col, bevel=0.0)
    ground["preview_only"] = True
    add_area_light("MG_Key", (-3.6, -3.8, 4.8), 420, 3.6, (1.0, 0.94, 0.86), col, (0, -0.3, 0.35))
    add_area_light("MG_Fill", (4.2, -1.4, 3.2), 150, 4.0, (0.82, 0.90, 1.0), col, (0, -0.2, 0.3))
    add_area_light("MG_Rim", (1.2, 4.4, 3.8), 340, 2.8, (1.0, 0.88, 0.72), col, (0, 0.1, 0.4))
    add_area_light("MG_Top", (0.0, 0.4, 5.2), 120, 2.0, (1.0, 1.0, 1.0), col, (0, -0.1, 0.4))
    cams = {
        "hero": add_camera("MG_Cam_Hero", (2.05, 2.20, 1.42), (0.0, -0.22, 0.50), 52, col),
        "pov": add_camera("MG_Cam_POV", (0.100, 0.800, 0.700), (0.0, -2.30, 0.48), 46, col),
        "detail": add_camera("MG_Cam_Detail", (0.95, 0.88, 1.05), (0.0, -0.05, 0.55), 90, col),
        "side": add_camera("MG_Cam_Side", (3.2, 0.1, 0.55), (0.0, 0.1, 0.42), 85, col),
    }
    cams["side"].data.type = "ORTHO"
    cams["side"].data.ortho_scale = 2.15
    return cams


def configure_scene(scene):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 18
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 960
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.film_transparent = False


def render(scene, cam, path):
    scene.camera = cam
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("RENDER", path)


def link_asset_to_scene(scene, col_name, objects):
    col = bpy.data.collections.new(col_name)
    scene.collection.children.link(col)
    for ob in objects:
        col.objects.link(ob)
    return col


def build_preview_world(scene):
    w = bpy.data.worlds.new("MG_PreviewWorld")
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.018, 0.022, 0.026, 1)
    bg.inputs["Strength"].default_value = 0.35
    scene.world = w
    return w


def cleanup_previous():
    tank_scene = next((s for s in bpy.data.scenes if s.name != "IRON_DUST_MG_01"), None)
    if tank_scene:
        bpy.context.window.scene = tank_scene
    for sc in list(bpy.data.scenes):
        if sc.name.startswith("IRON_DUST_MG_01"):
            bpy.data.scenes.remove(sc)
    for ob in list(bpy.data.objects):
        if ob.name.startswith("MG_"):
            bpy.data.objects.remove(ob, do_unlink=True)
    for col in list(bpy.data.collections):
        if col.name.startswith(("MG_", "IRON_DUST_MG_01")):
            bpy.data.collections.remove(col)
    for block in (bpy.data.meshes, bpy.data.cameras, bpy.data.lights, bpy.data.materials, bpy.data.worlds):
        for item in list(block):
            if item.name.startswith("MG_"):
                block.remove(item)


def main():
    cleanup_previous()
    build_materials()

    mg_scene = bpy.data.scenes.new("IRON_DUST_MG_01")
    bpy.context.window.scene = mg_scene
    mg_root_col = bpy.data.collections.new("IRON_DUST_MG_01_Asset")
    mg_scene.collection.children.link(mg_root_col)
    studio_col = bpy.data.collections.new("MG_PreviewStudio")
    mg_scene.collection.children.link(studio_col)
    build_preview_world(mg_scene)

    root, mount, yaw, pitch, rec, grip, barrel, feed, optic = build_asset(mg_scene, mg_root_col)
    cams = build_standalone(mg_scene, studio_col)
    configure_scene(mg_scene)

    bpy.context.view_layer.update()
    groups = {
        "mount": mount,
        "yaw": yaw,
        "receiver": rec,
        "optic": optic,
        "grip": grip,
        "barrel": barrel,
        "feed": feed,
    }
    for ob in list(mg_root_col.objects):
        if ob.type != "MESH":
            continue
        n = ob.name
        target = None
        if n.startswith("MG_Mount_"):
            target = groups["mount"]
        elif n.startswith(("MG_Yoke", "MG_Trunnion")):
            target = groups["yaw"]
        elif n.startswith("MG_Receiver"):
            target = groups["receiver"]
        elif n.startswith("MG_Optic"):
            target = groups["optic"]
        elif n.startswith("MG_Grip"):
            target = groups["grip"]
        elif n.startswith(("MG_Barrel", "MG_Muzzle_")):
            target = groups["barrel"]
        elif n.startswith(("MG_Ammo", "MG_Belt", "MG_Brass")):
            target = groups["feed"]
        if target is not None:
            if target in (groups["mount"], groups["yaw"]):
                parent_keep(ob, target)
            else:
                ob.parent = target
    bpy.context.view_layer.update()

    root.location = (0, 0, 0)
    render(mg_scene, cams["hero"], os.path.join(PREVIEW_DIR, "hero.png"))
    render(mg_scene, cams["detail"], os.path.join(PREVIEW_DIR, "detail.png"))
    render(mg_scene, cams["side"], os.path.join(PREVIEW_DIR, "side.png"))
    render(mg_scene, cams["pov"], os.path.join(PREVIEW_DIR, "pov.png"))

    asset_objects = list(mg_root_col.objects)
    studio_objects = list(studio_col.objects)
    tank_scene = next((s for s in bpy.data.scenes if s.name != "IRON_DUST_MG_01"
                       and "TurretPivot" in bpy.data.objects), None)

    if tank_scene is not None:
        root.location = MOUNT
        tmp_col = link_asset_to_scene(tank_scene, "MG_MountedPreview", asset_objects)
        bpy.context.window.scene = tank_scene
        mounted_third = add_camera("MG_Mounted_Cam_Third", (7.2, 10.0, 6.2), (0.15, -0.5, 2.15), 62, tmp_col)
        mounted_pov = add_camera("MG_Mounted_Cam_POV", (1.050, 1.450, 3.430), (0.95, -4.0, 3.18), 44, tmp_col)
        add_area_light("MG_Mounted_Fill", (4.8, 2.0, 5.4), 900, 4.0, (0.82, 0.90, 1.0), tmp_col, (0.8, 0.2, 2.6))
        configure_scene(tank_scene)
        tank_scene.render.resolution_x = 1280
        tank_scene.render.resolution_y = 760
        render(tank_scene, mounted_third, os.path.join(PREVIEW_DIR, "mounted_third_person.png"))
        render(tank_scene, mounted_pov, os.path.join(PREVIEW_DIR, "mounted_pov.png"))
        root.location = (0, 0, 0)
        for ob in list(tmp_col.objects):
            tmp_col.objects.unlink(ob)
        bpy.data.collections.remove(tmp_col)
        bpy.context.window.scene = mg_scene

    bpy.ops.object.select_all(action="DESELECT")
    for ob in asset_objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=GLB_PATH, export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_extras=True,
                              export_cameras=False, export_lights=False, export_animations=False)
    print("EXPORT", GLB_PATH)

    ids = {mg_scene, mg_root_col, studio_col, mg_scene.world}
    for ob in asset_objects + studio_objects:
        ids.add(ob)
        if ob.data:
            ids.add(ob.data)
            if ob.type == "MESH":
                for m in ob.data.materials:
                    if m:
                        ids.add(m)
    bpy.data.libraries.write(BLEND_PATH, ids, compress=True)
    print("SAVE", BLEND_PATH)
    print("TRIANGLES", sum(len(p.vertices) - 2 for ob in asset_objects if ob.type == "MESH" for p in ob.data.polygons))
    print("ASSET_OBJECTS", len(asset_objects))
    print("MOUNT", tuple(round(v, 3) for v in MOUNT))


main()
