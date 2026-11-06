"""UA Infantry 01 — Blender üretim betiği.

Blender içinde çalıştırılır:
    exec(open("/home/mami/Projects/d3/scripts/blender/build_ua_infantry_01.py").read())

İsteğe bağlı: exec(..., {"UA_RUN": "build"})  -> yalnız model; "export" -> model + GLB + doğrulama.

Yalnız UA_INFANTRY_01 sahnesindeki asker ve referans koleksiyonlarını yeniden kurar.
Ölçek metre; asker −Y yönüne bakar, +Z yukarı. Askerin sağı −X, solu +X.
Bütün geometri ve dokular bu betikte üretilir; dış model veya doku kullanılmaz.
"""

import json
import math
import os
import struct

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = "/home/mami/Projects/d3"
ASSET_DIR = os.path.join(ROOT, "assets/characters/ua_infantry_01")
TEX_DIR = os.path.join(ASSET_DIR, "textures")
GLB_PATH = os.path.join(ASSET_DIR, "ua_infantry_01.glb")
BLEND_PATH = os.path.join(ASSET_DIR, "ua_infantry_01.blend")
SCENE_NAME = "UA_INFANTRY_01"
COL_SOLDIER = "UA_Infantry_01"
COL_REF = "REF_ScaleReference"
TANK_GLB = os.path.join(ROOT, "assets/tanks/iron_dust_02/iron_dust_02.glb")
TANK_OFFSET = Vector((2.9, 1.2, 0.0))
ASSET_ID = "ua_infantry_01"

UP = Vector((0.0, 0.0, 1.0))


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3.0 - 2.0 * t)


def gauss(x):
    return math.exp(-x * x)


# ---------------------------------------------------------------------------
# Sahne ve koleksiyonlar
# ---------------------------------------------------------------------------


def get_scene():
    scene = bpy.data.scenes.get(SCENE_NAME) or bpy.data.scenes.new(SCENE_NAME)
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    bpy.context.window.scene = scene
    return scene


def get_collection(scene, name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
    if col.name not in scene.collection.children:
        scene.collection.children.link(col)
    return col


def clear_collection(col):
    for obj in list(col.all_objects):
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if isinstance(data, bpy.types.Mesh) and data.users == 0:
            bpy.data.meshes.remove(data)


# ---------------------------------------------------------------------------
# Dokular (numpy ile üretilir, textures/ altına PNG olarak kaydedilir)
# ---------------------------------------------------------------------------


def tile_noise(res, cells, rng):
    """Dikişsiz tekrarlanan, yumuşatılmış değer gürültüsü (res x res)."""
    g = rng.random((cells, cells))
    x = np.arange(res) / res * cells
    i0 = np.floor(x).astype(int) % cells
    i1 = (i0 + 1) % cells
    f = x - np.floor(x)
    f = f * f * (3 - 2 * f)
    a = g[np.ix_(i0, i0)]
    b = g[np.ix_(i0, i1)]
    c = g[np.ix_(i1, i0)]
    d = g[np.ix_(i1, i1)]
    fx = f[None, :]
    fy = f[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def save_image(name, rgb, filename):
    """rgb: (h, w, 3) sRGB 0..1 dizi."""
    h, w, _ = rgb.shape
    img = bpy.data.images.get(name)
    if img is not None:
        bpy.data.images.remove(img)
    img = bpy.data.images.new(name, w, h, alpha=False)
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(rgb, 0, 1)
    img.pixels.foreach_set(rgba.ravel())
    os.makedirs(TEX_DIR, exist_ok=True)
    path = os.path.join(TEX_DIR, filename)
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    img.filepath = path
    return img


def make_mm14_texture():
    """MM-14 esinli piksel kamuflaj: haki zemin, zeytin, kahve, koyu yeşil lekeler."""
    res, block = 512, 4
    cells = res // block
    rng = np.random.default_rng(1414)

    def field():
        return 0.55 * tile_noise(cells, 8, rng) + 0.30 * tile_noise(cells, 16, rng) + 0.15 * tile_noise(cells, 40, rng)

    f_olive, f_brown, f_dark = field(), field(), field()
    jitter = tile_noise(cells, 64, rng) * 0.06
    colors = {
        "base": (0.56, 0.55, 0.43),
        "olive": (0.41, 0.43, 0.29),
        "brown": (0.40, 0.33, 0.24),
        "dark": (0.24, 0.27, 0.19),
    }
    out = np.zeros((cells, cells, 3))
    out[:] = colors["base"]
    out[(f_olive + jitter) > 0.50] = colors["olive"]
    out[(f_brown + jitter) > 0.60] = colors["brown"]
    out[(f_dark + jitter) > 0.62] = colors["dark"]
    out = np.repeat(np.repeat(out, block, axis=0), block, axis=1)
    grain = (rng.random((res, res)) - 0.5) * 0.035
    out *= (1.0 + grain)[:, :, None]
    return save_image("UA_MM14", out, "ua_mm14_camo.png")


def make_cordura_texture():
    res = 256
    rng = np.random.default_rng(77)
    base = np.array((0.31, 0.33, 0.24))
    n = 0.6 * tile_noise(res, 16, rng) + 0.4 * tile_noise(res, 64, rng)
    weave = np.ones((res, res))
    weave[::4, :] *= 0.96
    weave[:, ::4] *= 0.97
    grain = (rng.random((res, res)) - 0.5) * 0.04
    shade = (0.93 + 0.12 * n) * weave * (1.0 + grain)
    return save_image("UA_Cordura", base[None, None, :] * shade[:, :, None], "ua_gear_cordura.png")


# Kafa dokusu: u = az/(2π)+0.5 (u=0.5 yüz önü), v = (zn+1)/2
SKIN_RGB = np.array((0.76, 0.58, 0.47))
NECK_UV = (0.5 + 1.0 / (2 * math.pi), (0.25 + 1) / 2)  # şakak; düz ten bölgesi


def make_skin_texture():
    res = 256
    rng = np.random.default_rng(5)
    u = (np.arange(res) + 0.5) / res
    v = (np.arange(res) + 0.5) / res
    U, V = np.meshgrid(u, v)
    az = (U - 0.5) * 2 * np.pi
    aa = np.abs(az)
    zn = V * 2 - 1

    def ss(e0, e1, x):
        t = np.clip((x - e0) / (e1 - e0), 0, 1)
        return t * t * (3 - 2 * t)

    def g(x):
        return np.exp(-x * x)

    rgb = np.zeros((res, res, 3))
    rgb[:] = SKIN_RGB
    noise = tile_noise(res, 32, rng)
    rgb *= (0.97 + 0.06 * noise)[:, :, None]
    # yanaklar hafif kızıl
    cheek = g((zn + 0.25) / 0.12) * g((aa - 0.7) / 0.22)
    rgb += cheek[:, :, None] * np.array((0.05, -0.02, -0.02))
    # sakal / bıyık (kısa, sık)
    stubble = ss(-0.32, -0.44, zn) * ss(1.55, 1.25, aa)
    sideburn = ss(0.02, -0.10, zn) * g((aa - 1.30) / 0.14) * ss(-1.0, -0.6, zn)
    stubble = np.maximum(stubble, sideburn)
    lips = g((zn + 0.56) / 0.045) * g(az / 0.20)
    stubble *= 1 - np.clip(lips * 1.6, 0, 1)
    speck = rng.random((res, res))
    beard_rgb = np.array((0.36, 0.29, 0.24))
    amt = (stubble * (0.55 + 0.25 * speck))[:, :, None]
    rgb = rgb * (1 - amt) + beard_rgb * amt
    # dudak
    rgb = rgb * (1 - lips[:, :, None] * 0.7) + np.array((0.62, 0.40, 0.36)) * lips[:, :, None] * 0.7
    # kaşlar
    brow = g((zn - (0.145 + 0.03 * np.cos(aa * 3))) / 0.025) * ss(0.06, 0.12, aa) * ss(0.62, 0.50, aa)
    rgb = rgb * (1 - brow[:, :, None] * 0.85) + np.array((0.22, 0.16, 0.12)) * brow[:, :, None] * 0.85
    # göz çevresi gölgesi (gözlüğün arkasında)
    eye = g((zn - 0.02) / 0.05) * g((aa - 0.36) / 0.12)
    rgb *= (1 - 0.25 * eye)[:, :, None]
    # kısa saç: üst ve ense
    hair = np.maximum(ss(0.30, 0.42, zn), ss(1.55, 1.85, aa) * ss(-0.45, -0.30, zn))
    hair_rgb = np.array((0.20, 0.16, 0.12)) * (0.9 + 0.2 * speck)[:, :, None]
    rgb = rgb * (1 - hair[:, :, None]) + hair_rgb * hair[:, :, None]
    return save_image("UA_SkinFace", rgb, "ua_skin_face.png")


# Nişan atlası: 4x4 hücre, her hücre düz renk
INSIGNIA_CELLS = {
    "blue": (0, 0, (0.0, 0.34, 0.72)),
    "yellow": (1, 0, (1.0, 0.84, 0.0)),
    "tape": (2, 0, (0.88, 0.74, 0.18)),
    "olive": (3, 0, (0.30, 0.32, 0.24)),
    "black": (0, 1, (0.08, 0.08, 0.08)),
}


def insignia_uv(cell):
    cx, cy, _ = INSIGNIA_CELLS[cell]
    return ((cx + 0.5) / 4.0, (cy + 0.5) / 4.0)


def make_insignia_texture():
    res = 64
    rgb = np.zeros((res, res, 3))
    rgb[:] = (0.5, 0.5, 0.5)
    for cx, cy, col in INSIGNIA_CELLS.values():
        rgb[cy * 16:(cy + 1) * 16, cx * 16:(cx + 1) * 16] = col
    return save_image("UA_Insignia", rgb, "ua_insignia_atlas.png")


# ---------------------------------------------------------------------------
# Malzemeler
# ---------------------------------------------------------------------------

MATERIALS = {
    # ad: (renk sRGB, pürüzlülük, metalik, doku anahtarı)
    "UA_Camo": ((1, 1, 1), 0.88, 0.0, "camo"),
    "UA_Gear": ((1, 1, 1), 0.82, 0.0, "cordura"),
    "UA_Dark": ((0.17, 0.18, 0.18), 0.78, 0.0, None),
    "UA_Boot": ((0.47, 0.39, 0.29), 0.86, 0.0, None),
    "UA_Skin": ((1, 1, 1), 0.62, 0.0, "skin"),
    "UA_Lens": ((0.13, 0.11, 0.09), 0.10, 0.0, None),
    "UA_Insignia": ((1, 1, 1), 0.75, 0.0, "insignia"),
}
TEXTURES = {}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def get_material(name):
    color, rough, metal, tex = MATERIALS[name]
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    for n in [n for n in nt.nodes if n.type == "TEX_IMAGE"]:
        nt.nodes.remove(n)
    lin = [srgb_to_linear(c) for c in color]
    bsdf.inputs["Base Color"].default_value = (*lin, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    mat.diffuse_color = (*lin, 1.0)
    if tex is not None and tex in TEXTURES:
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = TEXTURES[tex]
        node.interpolation = "Linear"
        node.location = (bsdf.location.x - 320, bsdf.location.y)
        nt.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


# ---------------------------------------------------------------------------
# Geometri yapı taşları (her biri yeni bmesh döndürür)
# ---------------------------------------------------------------------------


def perpendicular(v):
    a = Vector((1, 0, 0)) if abs(v.x) < 0.9 else Vector((0, 1, 0))
    return (a - v * a.dot(v)).normalized()


def tube(points, radii, seg=8, caps=True, ref=None):
    """Nokta dizisi boyunca elips kesitli boru. radii: float veya (a, b)."""
    pts = [Vector(p) for p in points]
    n = len(pts)
    tangents = []
    for i in range(n):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, n - 1)]
        tangents.append((b - a).normalized())
    u = perpendicular(tangents[0]) if ref is None else (Vector(ref) - tangents[0] * Vector(ref).dot(tangents[0])).normalized()
    frames = []
    for i in range(n):
        if i > 0:
            u = tangents[i - 1].rotation_difference(tangents[i]) @ u
            u = (u - tangents[i] * u.dot(tangents[i])).normalized()
        frames.append((u, tangents[i].cross(u)))
    bm = bmesh.new()
    rings = []
    for i, p in enumerate(pts):
        r = radii[i]
        ra, rb = (r, r) if isinstance(r, (int, float)) else r
        uu, vv = frames[i]
        rings.append([bm.verts.new(p + uu * math.cos(2 * math.pi * k / seg) * ra + vv * math.sin(2 * math.pi * k / seg) * rb) for k in range(seg)])
    for ra_, rb_ in zip(rings, rings[1:]):
        for k in range(seg):
            j = (k + 1) % seg
            bm.faces.new((ra_[k], ra_[j], rb_[j], rb_[k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def ellipsoid(center, radii, seg=16, rings=10, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    for v in bm.verts:
        p = Vector((v.co.x * radii[0], v.co.y * radii[1], v.co.z * radii[2]))
        if rot is not None:
            p = rot @ p
        v.co = p + Vector(center)
    return bm


def box(center, size, axes=None, bevel=0.004):
    """axes: (e1, e2, e3) birim vektörleri; size bu eksenlerde."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    e1, e2, e3 = axes if axes is not None else (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    c = Vector(center)
    for v in bm.verts:
        v.co = c + e1 * (v.co.x * size[0]) + e2 * (v.co.y * size[1]) + e3 * (v.co.z * size[2])
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=1, affect="EDGES")
    return bm


def slab(inner, normals, thick, wrap=False):
    """inner/normals/thick: satır x sütun. Kapalı ince plaka (wrap=True: sütunlar halka)."""
    bm = bmesh.new()
    rows, cols = len(inner), len(inner[0])
    vi = [[bm.verts.new(inner[r][c]) for c in range(cols)] for r in range(rows)]
    vo = [[bm.verts.new(inner[r][c] + normals[r][c] * thick[r][c]) for c in range(cols)] for r in range(rows)]
    cmax = cols if wrap else cols - 1
    for r in range(rows - 1):
        for c in range(cmax):
            d = (c + 1) % cols
            bm.faces.new((vo[r][c], vo[r][d], vo[r + 1][d], vo[r + 1][c]))
            bm.faces.new((vi[r][c], vi[r + 1][c], vi[r + 1][d], vi[r][d]))
    border = []
    for c in range(cmax):
        border.append(((0, c), (0, (c + 1) % cols)))
        border.append(((rows - 1, (c + 1) % cols), (rows - 1, c)))
    if not wrap:
        for r in range(rows - 1):
            border.append(((r + 1, 0), (r, 0)))
            border.append(((r, cols - 1), (r + 1, cols - 1)))
    for (ar, ac), (br, bc) in border:
        try:
            bm.faces.new((vi[ar][ac], vi[br][bc], vo[br][bc], vo[ar][ac]))
        except ValueError:
            pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def polygon_patch(points2d, origin, e1, e2, n, scale, surface=None, offset=0.0):
    """2B çokgeni (e1, e2) düzlemine yerleştirip üçgenler; surface verilirse yüzeye oturtur."""
    from mathutils.geometry import tessellate_polygon
    bm = bmesh.new()
    pts3 = []
    for x, y in points2d:
        p = Vector(origin) + e1 * (x * scale) + e2 * (y * scale)
        if surface is not None:
            hit, _ = surface.hit(p + n * 0.15, -n)
            if hit is not None:
                p = hit
        pts3.append(p + n * offset)
    verts = [bm.verts.new(p) for p in pts3]
    tris = tessellate_polygon([[Vector((x, y, 0)) for x, y in points2d]])
    for a, b, c in tris:
        bm.faces.new((verts[a], verts[b], verts[c]))
    bm.normal_update()
    for f in bm.faces:
        if f.normal.dot(n) < 0:
            f.normal_flip()
    return bm


# ---------------------------------------------------------------------------
# Parça birleştirici: bir nesne = bir bmesh + malzeme listesi
# ---------------------------------------------------------------------------


class Part:
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.fixed = self.bm.faces.layers.int.new("uv_fixed")
        self.mats = []

    def mat(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def add(self, src, mat_name, smooth=True, uv_fixed=False, uv_const=None, face_mat=None):
        """src bmesh'i bu parçaya kopyalar ve serbest bırakır.
        uv_fixed: src UV'si korunur. uv_const: tüm yüzlere sabit UV (atlas hücresi)."""
        src_uv = src.loops.layers.uv.active
        vmap = {v: self.bm.verts.new(v.co) for v in src.verts}
        for f in src.faces:
            try:
                nf = self.bm.faces.new([vmap[v] for v in f.verts])
            except ValueError:
                continue
            name = face_mat(f) if face_mat is not None else None
            nf.material_index = self.mat(name or mat_name)
            nf.smooth = smooth
            keep = uv_fixed(f) if callable(uv_fixed) else uv_fixed
            if uv_const is not None:
                for l in nf.loops:
                    l[self.uv].uv = uv_const
                nf[self.fixed] = 1
            elif keep and src_uv is not None:
                for ls, ld in zip(f.loops, nf.loops):
                    ld[self.uv].uv = ls[src_uv].uv
                nf[self.fixed] = 1
        src.free()

    def finish(self, col, parent, tile=0.42):
        bm = self.bm
        bm.normal_update()
        for f in bm.faces:
            if f[self.fixed]:
                continue
            nrm = f.normal
            ax = max(range(3), key=lambda i: abs(nrm[i]))
            for l in f.loops:
                co = l.vert.co
                if ax == 0:
                    uv = (co.y, co.z)
                elif ax == 1:
                    uv = (co.x, co.z)
                else:
                    uv = (co.x, co.y)
                l[self.uv].uv = (uv[0] / tile, uv[1] / tile)
        me = bpy.data.meshes.new(self.name)
        bm.to_mesh(me)
        bm.free()
        attr = me.attributes.get("uv_fixed")
        if attr is not None:
            me.attributes.remove(attr)
        for m in self.mats:
            me.materials.append(get_material(m))
        ob = bpy.data.objects.new(self.name, me)
        col.objects.link(ob)
        ob.parent = parent
        ob["asset_node_id"] = f"{ASSET_ID}/{self.name}"
        return ob


class Surface:
    """Gövdeye oturan ekipman için ışın atışı (arka yüz isabetlerini atlar)."""

    def __init__(self, bm):
        self.bm = bm
        bm.normal_update()
        self.tree = BVHTree.FromBMesh(bm)

    def hit(self, origin, direction, maxd=2.0):
        d = Vector(direction).normalized()
        o = Vector(origin)
        for _ in range(8):
            loc, nor, _, _ = self.tree.ray_cast(o, d, maxd)
            if loc is None:
                return None, None
            if nor.dot(d) < 0:
                return loc, nor
            o = loc + d * 1e-4
        return None, None


def conform_panel(surface, center, n, e1, e2, us, vs, offset, thick, pillow=0.45, ray_from=0.25):
    """Yüzeye oturan, kenarları incelen yastık plaka."""
    umax = max(abs(u) for u in us) or 1.0
    vmax = max(abs(v) for v in vs) or 1.0
    inner, normals, th = [], [], []
    for v in vs:
        row_i, row_n, row_t = [], [], []
        for u in us:
            p = Vector(center) + e1 * u + e2 * v
            hit, _ = surface.hit(p + n * ray_from, -n)
            q = (hit if hit is not None else p) + n * offset
            edge = min(1 - abs(u) / umax, 1 - abs(v) / vmax)
            k = (1 - pillow) + pillow * math.sin(min(1.0, edge * 4) * math.pi / 2)
            row_i.append(q)
            row_n.append(n)
            row_t.append(thick * k)
        inner.append(row_i)
        normals.append(row_n)
        th.append(row_t)
    return slab(inner, normals, th)


def wrap_band(surface, center_fn, zs, n_ang, gap, thick, origin_r=0.29, ang0=0.0, ang1=None, pillow=0.0):
    """Gövde çevresine sarılan bant. center_fn(z) -> (x, y). ang açıları önden (−Y) ölçülür."""
    closed = ang1 is None
    angs = [ang0 + 2 * math.pi * k / n_ang for k in range(n_ang)] if closed else [ang0 + (ang1 - ang0) * k / (n_ang - 1) for k in range(n_ang)]
    inner, normals, th = [], [], []
    for zi, z in enumerate(zs):
        cx, cy = center_fn(z)
        c = Vector((cx, cy, z))
        row_i, row_n, row_t = [], [], []
        for ai, a in enumerate(angs):
            d = Vector((math.sin(a), -math.cos(a), 0.0))
            hit, _ = surface.hit(c + d * origin_r, -d)
            q = (hit if hit is not None else c + d * 0.15) + d * gap
            edge = 1.0
            if pillow > 0:
                edge = min(1.0, 4 * min(zi, len(zs) - 1 - zi) / max(1, len(zs) - 1))
                if not closed:
                    edge = min(edge, 4 * min(ai, n_ang - 1 - ai) / (n_ang - 1))
            row_i.append(q)
            row_n.append(d)
            row_t.append(thick * ((1 - pillow) + pillow * edge))
        inner.append(row_i)
        normals.append(row_n)
        th.append(row_t)
    return slab(inner, normals, th, wrap=closed)


def limb_band(surface, p1, p2, t0, t1, gap, thick, seg=12, ray_r=0.16):
    """Uzuv çevresine sarılan bant (tanıma bandı, dizlik kayışı)."""
    p1, p2 = Vector(p1), Vector(p2)
    axis = (p2 - p1).normalized()
    u = perpendicular(axis)
    w = axis.cross(u)
    inner, normals, th = [], [], []
    for t in (t0, t1):
        c = p1.lerp(p2, t)
        row_i, row_n, row_t = [], [], []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            d = u * math.cos(a) + w * math.sin(a)
            hit, _ = surface.hit(c + d * ray_r, -d)
            q = (hit if hit is not None else c + d * 0.06) + d * gap
            row_i.append(q)
            row_n.append(d)
            row_t.append(thick)
        inner.append(row_i)
        normals.append(row_n)
        th.append(row_t)
    return slab(inner, normals, th, wrap=True)


# ---------------------------------------------------------------------------
# Oranlar ve iskelet noktaları (sol taraf +X; sağ taraf aynalanır)
# ---------------------------------------------------------------------------

SKIN_K = 1.16  # subdivision'ın skin yarıçaplarını küçültmesini telafi eder
HIP = Vector((0.092, 0.002, 0.855))
KNEE = Vector((0.108, -0.012, 0.50))
ANKLE = Vector((0.120, 0.010, 0.10))
SHOULDER = Vector((0.185, 0.005, 1.435))
ARM_DIR = Vector((0.707, 0.0, -0.707))  # A-poz: yataydan 45° aşağı
ELBOW = SHOULDER + ARM_DIR * 0.30
FORE_DIR = Vector((0.62, -0.18, -0.76)).normalized()
WRIST = ELBOW + FORE_DIR * 0.265


def mx(v, sx):
    return Vector((v.x * sx, v.y, v.z))


def torso_center(z):
    return (0.0, 0.004 if z > 1.0 else 0.010)


# ---------------------------------------------------------------------------
# F1 — Gövde (tek skinlenebilir mesh) ve eldivenler
# ---------------------------------------------------------------------------


def build_body_skin(col):
    verts, edges, radii = [], [], []

    def add(p, r, link=None):
        verts.append(Vector(p))
        radii.append((r[0] * SKIN_K, r[1] * SKIN_K))
        i = len(verts) - 1
        if link is not None:
            edges.append((link, i))
        return i

    def chain(start, items):
        prev = start
        for p, r in items:
            prev = add(p, r, prev)
        return prev

    root = add((0, 0.012, 0.90), (0.165, 0.118))
    t1 = add((0, 0.006, 1.00), (0.150, 0.108), root)
    t2 = add((0, 0.000, 1.10), (0.146, 0.106), t1)
    t3 = add((0, -0.004, 1.20), (0.156, 0.112), t2)
    t4 = add((0, -0.006, 1.30), (0.170, 0.120), t3)
    t5 = add((0, 0.000, 1.39), (0.170, 0.112), t4)
    chain(t5, [((0, 0.018, 1.475), (0.060, 0.056)), ((0, 0.024, 1.54), (0.053, 0.050)), ((0, 0.024, 1.60), (0.050, 0.047))])
    for sx in (1, -1):
        sh, el, wr = mx(SHOULDER, sx), mx(ELBOW, sx), mx(WRIST, sx)
        d, fd = mx(ARM_DIR, sx), mx(FORE_DIR, sx)
        c = add((sx * 0.115, 0.004, 1.44), (0.075, 0.068), t5)
        chain(c, [
            (sh, (0.066, 0.062)),
            (sh + d * 0.15, (0.061, 0.058)),
            (el - d * 0.035, (0.051, 0.050)),
            (el, (0.049, 0.048)),
            (el + fd * 0.035, (0.048, 0.047)),
            (el + fd * 0.14, (0.045, 0.043)),
            (wr - fd * 0.02, (0.040, 0.038)),
            (wr + fd * 0.005, (0.041, 0.039)),
        ])
        hp, kn, an = mx(HIP, sx), mx(KNEE, sx), mx(ANKLE, sx)
        h = add(hp, (0.098, 0.098), root)
        chain(h, [
            (hp.lerp(kn, 0.45), (0.090, 0.088)),
            (kn + Vector((0, 0, 0.045)), (0.071, 0.071)),
            (kn, (0.069, 0.069)),
            (kn - Vector((0, 0, 0.045)), (0.068, 0.068)),
            (kn.lerp(an, 0.35), (0.068, 0.066)),
            (Vector((an.x, an.y, 0.25)), (0.067, 0.066)),
            (Vector((an.x, an.y, 0.20)), (0.057, 0.057)),
            (Vector((an.x, an.y, 0.15)), (0.050, 0.050)),
        ])

    me = bpy.data.meshes.new("_tmp_body_skin")
    me.from_pydata([tuple(v) for v in verts], edges, [])
    ob = bpy.data.objects.new("_tmp_body_skin", me)
    col.objects.link(ob)
    mod = ob.modifiers.new("Skin", "SKIN")
    mod.branch_smoothing = 0.3
    for i, r in enumerate(radii):
        me.skin_vertices[0].data[i].radius = r
    me.skin_vertices[0].data[root].use_root = True
    ob.modifiers.new("Subsurf", "SUBSURF").levels = 2
    dg = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new()
    bm.from_object(ob, dg)
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.meshes.remove(me)

    # Biçimlendirme: kalça arkası, sırt düzlüğü, pantolon arka bolluğu
    for v in bm.verts:
        x, y, z = v.co
        ax = abs(x)
        if y > 0 and 0.76 < z < 1.0 and ax < 0.17:
            v.co.y += 0.020 * gauss((z - 0.87) / 0.06) * gauss((ax - 0.075) / 0.05)
        if y < 0 and 0.80 < z < 0.95 and ax < 0.06:
            v.co.y -= 0.006 * gauss((z - 0.88) / 0.03)
    bm.normal_update()
    return bm


def build_gloves(part):
    for sx in (1, -1):
        wr = mx(WRIST, sx)
        f = mx(FORE_DIR, sx)
        n = (Vector((0, 0, -1)) - f * f.dot(Vector((0, 0, -1)))).normalized()  # avuç içi yönü
        s = n.cross(f).normalized()
        if s.y > 0:
            s = -s  # başparmak öne (−Y)
        # avuç
        rings = [(-0.02, 0.030, 0.020), (0.0, 0.034, 0.019), (0.04, 0.042, 0.017), (0.072, 0.044, 0.0145), (0.084, 0.041, 0.013)]
        bm = bmesh.new()
        built = []
        for t, ws, wn in rings:
            c = wr + f * t
            built.append([bm.verts.new(c + s * math.cos(2 * math.pi * k / 10) * ws + n * math.sin(2 * math.pi * k / 10) * wn) for k in range(10)])
        for a, b in zip(built, built[1:]):
            for k in range(10):
                j = (k + 1) % 10
                bm.faces.new((a[k], a[j], b[j], b[k]))
        bm.faces.new(list(reversed(built[0])))
        bm.faces.new(built[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        part.add(bm, "UA_Dark")
        # parmaklar: işaret, orta, yüzük, serçe
        fingers = [(0.030, (0.036, 0.022, 0.018), 4), (0.010, (0.040, 0.025, 0.019), 0), (-0.010, (0.037, 0.023, 0.018), -4), (-0.028, (0.029, 0.018, 0.016), -9)]
        for off, lens, splay in fingers:
            p = wr + f * 0.076 + s * off + n * 0.002
            d = (Matrix.Rotation(math.radians(splay), 3, n) @ f).normalized()
            pts, rad = [p], [0.0098]
            for i, ln in enumerate(lens):
                curl = math.radians((8, 14, 12)[i])
                axis = d.cross(n).normalized()
                d = (Matrix.Rotation(curl, 3, axis) @ d).normalized()
                if d.dot(n) < 0:
                    d = (Matrix.Rotation(-2 * curl, 3, axis) @ d).normalized()
                p = p + d * ln
                pts.append(p)
                rad.append(0.0095 - 0.0005 * (i + 1))
            part.add(tube(pts, [(r, r * 0.88) for r in rad], seg=6, ref=n), "UA_Dark")
        # başparmak
        p = wr + f * 0.012 + s * 0.028 + n * 0.010
        d = (f * 0.75 + s * 0.42 + n * 0.45).normalized()
        pts, rad = [p], [0.012]
        for i, ln in enumerate((0.030, 0.026, 0.022)):
            axis = d.cross(n).normalized()
            d = (Matrix.Rotation(math.radians(12), 3, axis) @ d).normalized()
            if d.dot(n) < 0.2:
                d = (Matrix.Rotation(math.radians(-24), 3, axis) @ d).normalized()
            p = p + d * ln
            pts.append(p)
            rad.append(0.0115 - 0.0008 * (i + 1))
        part.add(tube(pts, [(r, r * 0.9) for r in rad], seg=6, ref=n), "UA_Dark")
        # eldiven bilek manşeti
        part.add(tube([wr - f * 0.012, wr + f * 0.012], [(0.040, 0.026), (0.039, 0.025)], seg=10, ref=n), "UA_Dark")


# ---------------------------------------------------------------------------
# F2 — Kafa, kask, kulaklık, gözlük
# ---------------------------------------------------------------------------

HEAD_C = Vector((0.0, 0.004, 1.685))
HEAD_R = (0.074, 0.097, 0.118)


def head_point(az, zn, extra=0.0):
    """Analitik kafa yüzeyi. az: önden (−Y) açı, zn: −1 (çene) .. 1 (tepe)."""
    zn = max(-1.0, min(1.0, zn))
    rxy = math.sqrt(max(0.0, 1 - zn * zn))
    x = math.sin(az) * rxy
    y = -math.cos(az) * rxy
    front = max(0.0, -y)
    back = max(0.0, y)
    aa = abs(az)
    mw = 1.0 - 0.22 * smoothstep(-0.30, -1.0, zn)
    mw *= 1.0 + 0.05 * back * smoothstep(-0.4, 0.2, zn)
    md = 0.93 if y < 0 else 1.0
    if y > 0:
        md *= 1.0 - 0.30 * smoothstep(-0.25, -0.95, zn)
    if y < 0:
        md *= 1.0 - 0.05 * smoothstep(-0.55, -1.0, zn)
    p = HEAD_C + Vector((x * HEAD_R[0] * mw, y * HEAD_R[1] * md, zn * HEAD_R[2]))
    fwd = Vector((0, -1, 0))
    # burun
    if -0.42 < zn < 0.10:
        k = max(0.0, min(1.0, (0.08 - zn) / 0.38))
        amp = (0.004 + 0.017 * k ** 1.5) * smoothstep(-0.42, -0.31, zn)
        sig = 0.12 + 0.04 * k
        p += fwd * amp * gauss(az / sig) * front
    p += fwd * 0.005 * gauss((zn - 0.14) / 0.07) * gauss(az / 0.55) * front  # kaş kemeri
    p -= fwd * 0.007 * gauss((zn - 0.01) / 0.08) * gauss((aa - 0.36) / 0.17) * front  # göz çukuru
    p += fwd * 0.004 * gauss((zn + 0.56) / 0.06) * gauss(az / 0.28) * front  # dudaklar
    p += fwd * 0.009 * gauss((zn + 0.86) / 0.10) * gauss(az / 0.35) * front  # çene ucu
    side = Vector((math.sin(az), 0, 0))
    p += side * 0.004 * gauss((zn + 0.12) / 0.12) * gauss((aa - 0.75) / 0.25)  # elmacık
    if extra:
        p += (p - HEAD_C).normalized() * extra
    return p


def build_head(col):
    n_az, n_z = 64, 40
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    grid = []
    for j in range(1, n_z):
        th = math.pi * j / n_z
        zn = -math.cos(th)
        grid.append([(bm.verts.new(head_point(2 * math.pi * i / n_az - math.pi, zn)), i / n_az, (zn + 1) / 2) for i in range(n_az)])
    bottom = bm.verts.new(head_point(0, -1.0))
    top = bm.verts.new(head_point(0, 1.0))

    def put(face, uvs):
        for l, uv in zip(face.loops, uvs):
            l[uvl].uv = uv

    for r in range(len(grid) - 1):
        for i in range(n_az):
            j = (i + 1) % n_az
            a, b = grid[r][i], grid[r][j]
            c, d = grid[r + 1][j], grid[r + 1][i]
            ub = b[1] if j != 0 else 1.0
            f = bm.faces.new((a[0], b[0], c[0], d[0]))
            put(f, [(a[1], a[2]), (ub, b[2]), (ub, c[2]), (d[1], d[2])])
    for i in range(n_az):
        j = (i + 1) % n_az
        a, b = grid[0][i], grid[0][j]
        ub = b[1] if j != 0 else 1.0
        f = bm.faces.new((bottom, b[0], a[0]))
        put(f, [((a[1] + ub) / 2, 0.0), (ub, b[2]), (a[1], a[2])])
        a, b = grid[-1][i], grid[-1][j]
        f = bm.faces.new((top, a[0], b[0]))
        put(f, [((a[1] + ub) / 2, 1.0), (a[1], a[2]), (ub, b[2])])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # yüksek çözünürlüklü biçimi koruyarak sadeleştir
    me = bpy.data.meshes.new("_tmp_head")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("_tmp_head", me)
    col.objects.link(ob)
    dec = ob.modifiers.new("Decimate", "DECIMATE")
    dec.ratio = 0.30
    dg = bpy.context.evaluated_depsgraph_get()
    out = bmesh.new()
    out.from_object(ob, dg)
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.meshes.remove(me)
    return out


HELMET_C = Vector((0.0, 0.010, 1.695))
HELMET_R = (0.108, 0.128, 0.118)
HELMET_T = 0.011
_CUT = [(0, 1.738), (40, 1.734), (70, 1.726), (85, 1.722), (105, 1.722), (125, 1.698), (150, 1.676), (180, 1.668)]


def helmet_cut_z(az):
    a = abs(math.degrees(((az + math.pi) % (2 * math.pi)) - math.pi))
    for (a0, z0), (a1, z1) in zip(_CUT, _CUT[1:]):
        if a0 <= a <= a1:
            t = (a - a0) / (a1 - a0)
            t = t * t * (3 - 2 * t)
            return z0 + (z1 - z0) * t
    return _CUT[-1][1]


def helmet_el_cut(az):
    return math.asin(max(-1.0, min(1.0, (helmet_cut_z(az) - HELMET_C.z) / HELMET_R[2])))


def helmet_point(az, el, extra=0.0):
    d = Vector((math.cos(el) * math.sin(az) * HELMET_R[0], -math.cos(el) * math.cos(az) * HELMET_R[1], math.sin(el) * HELMET_R[2]))
    p = HELMET_C + d
    if extra:
        p += d.normalized() * extra
    return p


def helmet_normal(az, el):
    return (helmet_point(az, el) - HELMET_C).normalized()


def build_helmet(part):
    n_az, n_el = 40, 8
    inner, normals, th = [], [], []
    for r in range(n_el):
        row_i, row_n, row_t = [], [], []
        for i in range(n_az):
            az = 2 * math.pi * i / n_az - math.pi
            e0 = helmet_el_cut(az)
            el = e0 + (math.radians(86) - e0) * (r / (n_el - 1)) ** 0.9
            p = helmet_point(az, el)
            nrm = helmet_normal(az, el)
            row_i.append(p - nrm * HELMET_T)
            row_n.append(nrm)
            row_t.append(HELMET_T)
        inner.append(row_i)
        normals.append(row_n)
        th.append(row_t)
    bm = slab(inner, normals, th, wrap=True)
    # tepe kapakları (dış ve iç)
    bm.verts.ensure_lookup_table()
    cols = n_az
    outer_top = [bm.verts[n_el * cols + (n_el - 1) * cols + i] for i in range(cols)]
    inner_top = [bm.verts[(n_el - 1) * cols + i] for i in range(cols)]
    po = bm.verts.new(HELMET_C + Vector((0, 0, HELMET_R[2])))
    pi_ = bm.verts.new(HELMET_C + Vector((0, 0, HELMET_R[2] - HELMET_T)))
    for i in range(cols):
        j = (i + 1) % cols
        bm.faces.new((outer_top[i], outer_top[j], po))
        bm.faces.new((inner_top[j], inner_top[i], pi_))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    part.add(bm, "UA_Camo")

    def surface_slab(az0, az1, el0_fn, el1_fn, off, thick, nu=8, nv=2):
        inner_, normals_, th_ = [], [], []
        for r in range(nv + 1):
            row_i, row_n, row_t = [], [], []
            for c in range(nu + 1):
                az = az0 + (az1 - az0) * c / nu
                el = el0_fn(az) + (el1_fn(az) - el0_fn(az)) * r / nv
                row_i.append(helmet_point(az, el, off))
                row_n.append(helmet_normal(az, el))
                row_t.append(thick)
            inner_.append(row_i)
            normals_.append(row_n)
            th_.append(row_t)
        return slab(inner_, normals_, th_)

    # yan raylar
    for s in (1, -1):
        a0, a1 = sorted((s * math.radians(58), s * math.radians(118)))
        part.add(surface_slab(a0, a1, lambda a: helmet_el_cut(a) + 0.03, lambda a: helmet_el_cut(a) + 0.20, 0.0, 0.008), "UA_Dark", smooth=False)
    # tepe cırt bandı, arka cırt + denge cebi
    part.add(surface_slab(math.radians(-32), math.radians(32), lambda a: math.radians(48), lambda a: math.radians(72), 0.0, 0.002), "UA_Gear", smooth=False)
    part.add(surface_slab(math.radians(158), math.radians(202), lambda a: helmet_el_cut(a) + 0.08, lambda a: helmet_el_cut(a) + 0.42, 0.0, 0.022), "UA_Gear", smooth=False)
    # gece görüşü bağlantı plakası
    el = helmet_el_cut(0.0) + 0.07
    nrm = helmet_normal(0.0, el)
    up = (UP - nrm * UP.dot(nrm)).normalized()
    side = up.cross(nrm).normalized()
    part.add(box(helmet_point(0.0, el, 0.006), (0.050, 0.034, 0.012), axes=(side, up, nrm), bevel=0.003), "UA_Dark", smooth=False)
    # çene kayışları (Y kayış)
    for s in (1, -1):
        j = head_point(s * math.radians(92), -0.55, 0.006)
        chin = head_point(0.0, -0.94, 0.007)
        front_a = helmet_point(s * math.radians(72), helmet_el_cut(s * math.radians(72)) + 0.01, -0.012)
        back_a = helmet_point(s * math.radians(118), helmet_el_cut(s * math.radians(118)) + 0.01, -0.012)
        for a in (front_a, back_a):
            part.add(tube([a, a.lerp(j, 0.5) + Vector((s * 0.004, 0, 0)), j], [(0.004, 0.0015)] * 3, seg=4), "UA_Dark", smooth=False)
        mid = j.lerp(chin, 0.5) + Vector((0, 0, -0.006))
        part.add(tube([j, mid, chin], [(0.0045, 0.0015)] * 3, seg=4), "UA_Dark", smooth=False)


def build_headset(part):
    cups = {}
    for s in (1, -1):
        ear = head_point(s * math.pi / 2, -0.10)
        out = Vector((s, 0, 0))
        c0 = ear + out * 0.006
        c1 = ear + out * 0.036
        part.add(tube([c0, c0.lerp(c1, 0.5), c1], [(0.040, 0.045), (0.042, 0.047), (0.036, 0.041)], seg=14, ref=UP), "UA_Dark")
        cups[s] = (c0, c1)
        # rail adaptörü: kap üstünden kask rayına
        top = c1.lerp(c0, 0.5) + Vector((0, 0, 0.04))
        rail = helmet_point(s * math.pi / 2, helmet_el_cut(s * math.pi / 2) + 0.08, 0.004)
        part.add(tube([top, top.lerp(rail, 0.5) + Vector((s * 0.004, 0, 0)), rail], [0.006, 0.006, 0.006], seg=6), "UA_Dark")
    # ense bandı
    l0 = cups[1][0] + Vector((-0.004, 0.02, -0.03))
    r0 = cups[-1][0] + Vector((0.004, 0.02, -0.03))
    back = head_point(math.pi, -0.42, 0.012)
    pts = [l0, l0.lerp(back, 0.5) + Vector((0.02, 0.012, 0)), back, r0.lerp(back, 0.5) + Vector((-0.02, 0.012, 0)), r0]
    part.add(tube(pts, [(0.007, 0.003)] * len(pts), seg=6), "UA_Dark")
    # mikrofon kolu (sağ kap → ağız köşesi)
    c1 = cups[-1][1]
    mouth = head_point(-0.30, -0.52, 0.022)
    p0 = c1 + Vector((0.0, -0.025, -0.012))
    pts = [p0, p0.lerp(mouth, 0.5) + Vector((-0.012, 0, -0.006)), mouth]
    part.add(tube(pts, [0.0035, 0.0032, 0.003], seg=6), "UA_Dark")
    part.add(ellipsoid(mouth + Vector((0.004, -0.003, 0)), (0.008, 0.007, 0.007), seg=8, rings=5), "UA_Dark")


def build_glasses(part):
    def strip(az0, az1, z0, z1, extra, nu, thick):
        z0f = z0 if callable(z0) else (lambda a: z0)
        z1f = z1 if callable(z1) else (lambda a: z1)
        inner, normals, th = [], [], []
        for r in range(3):
            row_i, row_n, row_t = [], [], []
            for c in range(nu + 1):
                az = az0 + (az1 - az0) * c / nu
                zn = z0f(az) + (z1f(az) - z0f(az)) * r / 2
                ex = extra + 0.006 * math.cos(az)
                p = head_point(az, zn, ex)
                n = (p - HEAD_C)
                n.z = 0
                n.normalize()
                row_i.append(p)
                row_n.append(n)
                row_t.append(thick)
            inner.append(row_i)
            normals.append(row_n)
            th.append(row_t)
        return slab(inner, normals, th)

    lens_bottom = lambda a: -0.04 - 0.13 * gauss((abs(a) - 0.38) / 0.30)
    part.add(strip(-1.10, 1.10, lens_bottom, 0.11, 0.012, 26, 0.003), "UA_Lens")
    part.add(strip(-1.12, 1.12, 0.095, 0.135, 0.013, 22, 0.005), "UA_Dark")
    for s in (1, -1):
        a0, a1 = sorted((s * 1.08, s * 1.62))
        part.add(strip(a0, a1, 0.05, 0.10, 0.006, 5, 0.003), "UA_Dark")


# ---------------------------------------------------------------------------
# F3 — Plaka taşıyıcı, cepler, kemer, giysi ayrıntıları, botlar, nişanlar
# ---------------------------------------------------------------------------


def panel_rays(surface, zs, hw_fn, front, gap, thick, nx=9, pillow=0.4):
    """Göğüs/sırt plakası: önden (front=True) veya arkadan +/−Y ışınlarıyla oturtulur."""
    dirn = Vector((0, 1, 0)) if front else Vector((0, -1, 0))
    out = -dirn
    inner, normals, th = [], [], []
    for ri, z in enumerate(zs):
        hw = hw_fn(z)
        row_i, row_n, row_t = [], [], []
        for c in range(nx):
            u = -1 + 2 * c / (nx - 1)
            x = hw * u
            hit, _ = surface.hit(Vector((x, 0, z)) + out * 0.5, dirn)
            q = (hit if hit is not None else Vector((x, 0, z))) + out * gap
            edge = min(1 - abs(u), min(ri, len(zs) - 1 - ri) / max(1, (len(zs) - 1) / 2))
            k = (1 - pillow) + pillow * math.sin(min(1.0, edge * 3) * math.pi / 2)
            row_i.append(q)
            row_n.append(out)
            row_t.append(thick * k)
        inner.append(row_i)
        normals.append(row_n)
        th.append(row_t)
    return slab(inner, normals, th), inner


def surface_y(surface, x, z, front=True):
    d = Vector((0, 1, 0)) if front else Vector((0, -1, 0))
    hit, _ = surface.hit(Vector((x, 0, z)) - d * 0.5, d)
    return hit.y if hit is not None else (-0.13 if front else 0.13)


def build_plate_carrier(part, surface):
    def front_hw(z):
        if z > 1.40:
            return 0.145 - (z - 1.40) / 0.06 * 0.06
        return 0.145

    zs = [1.10 + i * (1.46 - 1.10) / 8 for i in range(9)]
    front_bm, _ = panel_rays(surface, zs, front_hw, True, 0.012, 0.042)
    part.add(front_bm, "UA_Gear")
    back_bm, _ = panel_rays(surface, [1.10 + i * (1.47 - 1.10) / 8 for i in range(9)], front_hw, False, 0.010, 0.038)
    part.add(back_bm, "UA_Gear")
    # yan kuşak (cummerbund) ön/arka plaka arasında iki yanda
    for s in (1, -1):
        a0, a1 = (math.radians(48), math.radians(132)) if s > 0 else (math.radians(-132), math.radians(-48))
        part.add(wrap_band(surface, torso_center, [1.12, 1.17, 1.22, 1.27], 12, 0.008, 0.016, ang0=a0, ang1=a1, pillow=0.3), "UA_Gear")
        # MOLLE şeritleri
        for z in (1.155, 1.205, 1.255):
            part.add(wrap_band(surface, torso_center, [z - 0.011, z + 0.011], 10, 0.024, 0.003, ang0=a0 + 0.08 * s, ang1=a1 - 0.08 * s), "UA_Gear", smooth=False)
    # arka MOLLE
    for z in (1.16, 1.21, 1.26, 1.31):
        y = surface_y(surface, 0.0, z, front=False) + 0.048
        part.add(box((0, y, z), (0.25, 0.006, 0.024), bevel=0.0015), "UA_Gear", smooth=False)
    # omuz askıları
    for s in (1, -1):
        x = s * 0.105
        pts, nrms = [], []
        for k in range(9):
            y = -0.13 + 0.26 * k / 8
            hit, _ = surface.hit(Vector((x, y, 1.75)), Vector((0, 0, -1)))
            z = hit.z if hit is not None else 1.45
            pts.append(Vector((x, y, z + 0.006)))
        pts[0].z = max(pts[0].z, 1.445)
        pts[-1].z = max(pts[-1].z, 1.45)
        part.add(tube(pts, [(0.030, 0.008)] * len(pts), seg=8, ref=Vector((1, 0, 0))), "UA_Gear")
    # arka sürükleme kulpu
    yb = surface_y(surface, 0.0, 1.45, front=False) + 0.045
    part.add(tube([(-0.035, yb, 1.43), (-0.03, yb + 0.018, 1.47), (0.03, yb + 0.018, 1.47), (0.035, yb, 1.43)], [(0.009, 0.004)] * 4, seg=6), "UA_Dark")

    # ön: üçlü şarjör cebi + idari cep (+ bayrak)
    fy = lambda x, z: surface_y(surface, x, z) - 0.012 - 0.042
    for i, x in enumerate((-0.083, 0.0, 0.083)):
        y = fy(x, 1.18)
        part.add(box((x, y - 0.026, 1.175), (0.076, 0.052, 0.13), bevel=0.008), "UA_Gear", smooth=False)
        part.add(box((x, y - 0.028, 1.245), (0.080, 0.058, 0.03), bevel=0.006), "UA_Gear", smooth=False)
        part.add(box((x, y - 0.054, 1.205), (0.012, 0.004, 0.06), bevel=0.0), "UA_Dark", smooth=False)
    y = fy(0.0, 1.34)
    part.add(box((0, y - 0.014, 1.335), (0.20, 0.028, 0.105), bevel=0.008), "UA_Gear", smooth=False)
    # telsiz cebi + anten (sol arka yan)
    a = math.radians(118)
    d = Vector((math.sin(a), -math.cos(a), 0))
    hit, _ = surface.hit(Vector((0, 0.004, 1.22)) + d * 0.29, -d)
    base = (hit if hit is not None else Vector((0.17, 0.06, 1.22))) + d * 0.050
    tang = UP.cross(d).normalized()
    part.add(box(base, (0.070, 0.045, 0.16), axes=(tang, d, UP), bevel=0.008), "UA_Gear", smooth=False)
    top = base + UP * 0.08 + d * 0.005
    part.add(tube([top, top + Vector((0.005, 0.01, 0.03))], [0.009, 0.009], seg=8), "UA_Dark")
    ant = [top + Vector((0.005, 0.01, 0.03)), top + Vector((0.015, 0.03, 0.15)), top + Vector((0.03, 0.07, 0.31))]
    part.add(tube(ant, [0.004, 0.003, 0.0022], seg=6), "UA_Dark")
    # ilk yardım cebi (sağ arka yan)
    a = math.radians(-120)
    d = Vector((math.sin(a), -math.cos(a), 0))
    hit, _ = surface.hit(Vector((0, 0.004, 1.19)) + d * 0.29, -d)
    base = (hit if hit is not None else Vector((-0.17, 0.06, 1.19))) + d * 0.05
    tang = UP.cross(d).normalized()
    part.add(box(base, (0.12, 0.06, 0.10), axes=(tang, d, UP), bevel=0.012), "UA_Gear", smooth=False)
    # arka küçük yardımcı cep
    yb = surface_y(surface, 0.0, 1.30, front=False) + 0.045
    part.add(box((0, yb + 0.025, 1.30), (0.16, 0.05, 0.11), bevel=0.012), "UA_Gear", smooth=False)


def build_belt(part, surface):
    part.add(wrap_band(surface, torso_center, [0.985, 1.015, 1.045], 28, 0.006, 0.014), "UA_Gear")
    part.add(wrap_band(surface, torso_center, [0.997, 1.033], 28, 0.019, 0.004), "UA_Dark", smooth=False)
    fy = surface_y(surface, 0.0, 1.015) - 0.026
    part.add(box((0, fy, 1.015), (0.055, 0.012, 0.045), bevel=0.003), "UA_Dark", smooth=False)

    def on_belt(ang_deg, z, size, mat, cyl=False):
        a = math.radians(ang_deg)
        d = Vector((math.sin(a), -math.cos(a), 0))
        hit, _ = surface.hit(Vector((0, 0.01, z)) + d * 0.29, -d)
        base = (hit if hit is not None else Vector((0, 0, z))) + d * (0.026 + size[1] / 2)
        tang = UP.cross(d).normalized()
        if cyl:
            part.add(tube([base - tang * size[0] / 2, base + tang * size[0] / 2], [(size[1] / 2, size[2] / 2)] * 2, seg=10, ref=UP), mat)
        else:
            part.add(box(base, size, axes=(tang, d, UP), bevel=0.008), mat, smooth=False)

    on_belt(-150, 0.995, (0.15, 0.07, 0.075), "UA_Gear", cyl=True)  # katlanmış boş şarjör çantası
    on_belt(95, 0.99, (0.08, 0.04, 0.10), "UA_Gear")  # yardımcı cep
    on_belt(-35, 1.0, (0.045, 0.035, 0.11), "UA_Dark")  # turnike cebi


def build_uniform_details(part, surface):
    # yaka
    inner, normals, th = [], [], []
    for z, rx, ry in ((1.465, 0.080, 0.074), (1.51, 0.070, 0.066), (1.556, 0.064, 0.061)):
        row_i, row_n, row_t = [], [], []
        for k in range(16):
            a = 2 * math.pi * k / 16
            d = Vector((math.sin(a), -math.cos(a), 0))
            row_i.append(Vector((math.sin(a) * rx, 0.012 + 0.008 * (z - 1.465) / 0.09 - math.cos(a) * ry, z)))
            row_n.append(d)
            row_t.append(0.006)
        inner.append(row_i)
        normals.append(row_n)
        th.append(row_t)
    part.add(slab(inner, normals, th, wrap=True), "UA_Camo")
    for sx in (1, -1):
        sh, el = mx(SHOULDER, sx), mx(ELBOW, sx)
        d = mx(ARM_DIR, sx)
        n = Vector((sx * 0.707, 0, 0.707))
        e2 = -d
        e1 = e2.cross(n).normalized()
        # kol cebi + kapak
        c = sh.lerp(el, 0.36)
        part.add(conform_panel(surface, c, n, e1, e2, [-0.045, -0.022, 0, 0.022, 0.045], [-0.05, -0.02, 0.02, 0.05], 0.002, 0.008, ray_from=0.2), "UA_Camo")
        part.add(conform_panel(surface, c + e2 * 0.057, n, e1, e2, [-0.047, -0.022, 0, 0.022, 0.047], [-0.012, 0.012], 0.009, 0.004, ray_from=0.2, pillow=0.0), "UA_Camo")
        # kargo cebi (uyluk yanı)
        hp, kn = mx(HIP, sx), mx(KNEE, sx)
        tn = Vector((sx * 0.94, -0.34, 0)).normalized()
        axis = (hp - kn).normalized()
        e1 = axis.cross(tn).normalized()
        cc = hp.lerp(kn, 0.48)
        part.add(conform_panel(surface, cc, tn, e1, axis, [-0.065, -0.03, 0, 0.03, 0.065], [-0.08, -0.04, 0, 0.04, 0.08], 0.002, 0.020, ray_from=0.22), "UA_Camo")
        part.add(conform_panel(surface, cc + axis * 0.085, tn, e1, axis, [-0.068, -0.03, 0, 0.03, 0.068], [-0.018, 0.018], 0.020, 0.005, ray_from=0.22, pillow=0.0), "UA_Camo")


def build_knee_pads(part, surface):
    for sx in (1, -1):
        hp, kn, an = mx(HIP, sx), mx(KNEE, sx), mx(ANKLE, sx)
        n = Vector((sx * 0.15, -1, 0)).normalized()
        axis = (hp - kn).normalized()
        e1 = axis.cross(n).normalized()
        part.add(conform_panel(surface, kn, n, e1, axis, [-0.052, -0.03, 0, 0.03, 0.052], [-0.068, -0.04, 0, 0.04, 0.068], 0.004, 0.022, ray_from=0.2, pillow=0.6), "UA_Dark")
        for t in (-0.05, 0.05):
            c = kn + axis * t
            part.add(limb_band(surface, c - axis * 0.01, c + axis * 0.01, 0.0, 1.0, 0.002, 0.004, ray_r=0.14), "UA_Dark", smooth=False)


def build_boots(part):
    def ring(c, lat, hw, z0, z1, k=10):
        pts = []
        mid = (z0 + z1) / 2
        hh = (z1 - z0) / 2
        for i in range(k):
            a = 2 * math.pi * i / k
            ca, sa = math.cos(a), math.sin(a)
            x = hw * math.copysign(abs(ca) ** 0.6, ca)
            z = mid + hh * math.copysign(abs(sa) ** 0.6, sa)
            pts.append(Vector((c.x, c.y, 0)) + lat * x + Vector((0, 0, z)))
        return pts

    def loft(sections):
        bm = bmesh.new()
        rings = [[bm.verts.new(p) for p in s] for s in sections]
        for a, b in zip(rings, rings[1:]):
            n = len(a)
            for i in range(n):
                j = (i + 1) % n
                bm.faces.new((a[i], a[j], b[j], b[i]))
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return bm

    for sx in (1, -1):
        an = mx(ANKLE, sx)
        toe_out = math.radians(7) * sx
        fwd = Vector((math.sin(toe_out), -math.cos(toe_out), 0))
        lat = Vector((-fwd.y, fwd.x, 0))
        if lat.x * sx < 0:
            lat = -lat
        base = Vector((an.x, an.y, 0))
        upper = [(-0.075, 0.040, 0.105), (-0.050, 0.047, 0.13), (0.0, 0.051, 0.15), (0.06, 0.053, 0.105), (0.11, 0.055, 0.078), (0.16, 0.050, 0.062), (0.20, 0.042, 0.052), (0.222, 0.026, 0.044)]
        part.add(loft([ring(base + fwd * s, lat, hw, 0.026, top) for s, hw, top in upper]), "UA_Boot")
        sole = [(-0.082, 0.042), (-0.05, 0.051), (0.0, 0.054), (0.06, 0.057), (0.11, 0.060), (0.16, 0.055), (0.20, 0.046), (0.228, 0.03)]
        part.add(loft([ring(base + fwd * s, lat, hw, 0.0, 0.032, k=10) for s, hw in sole]), "UA_Dark")
        shaft_c = Vector((an.x, an.y + 0.004, 0))
        part.add(tube([shaft_c + Vector((0, 0, 0.09)), shaft_c + Vector((0, 0, 0.16)), shaft_c + Vector((0, 0, 0.225))], [(0.060, 0.064), (0.058, 0.062), (0.060, 0.063)], seg=12), "UA_Boot")
        # bağcık sırası
        for i in range(5):
            s = 0.005 + 0.022 * i
            z = 0.15 - 0.012 * i if s < 0.06 else 0.112 - 0.006 * (i - 2)
            p = base + fwd * (s + 0.02) + Vector((0, 0, z))
            part.add(box(p, (0.05, 0.006, 0.005), axes=(lat, fwd, UP), bevel=0.0), "UA_Dark", smooth=False)


TRYZUB = [
    [(-0.75, -1.0), (0.75, -1.0), (0.75, -0.80), (-0.75, -0.80)],
    [(-0.13, -0.80), (0.13, -0.80), (0.13, 0.65), (0.0, 1.10), (-0.13, 0.65)],
    [(-0.85, -0.80), (-0.66, -0.80), (-0.66, 0.70), (-0.755, 1.0), (-0.85, 0.70)],
    [(0.66, -0.80), (0.85, -0.80), (0.85, 0.70), (0.755, 1.0), (0.66, 0.70)],
    [(-0.66, -0.58), (-0.66, -0.36), (-0.13, -0.06), (-0.13, -0.28)],
    [(0.66, -0.58), (0.66, -0.36), (0.13, -0.06), (0.13, -0.28)],
]
SHIELD = [(-1.05, 1.30), (1.05, 1.30), (1.05, -0.35), (0.85, -0.85), (0.45, -1.20), (0.0, -1.38), (-0.45, -1.20), (-0.85, -0.85), (-1.05, -0.35)]


def build_insignia(part, surface):
    for sx in (1, -1):
        sh, el = mx(SHOULDER, sx), mx(ELBOW, sx)
        d = mx(ARM_DIR, sx)
        n = Vector((sx * 0.707, 0, 0.707))
        e2 = -d
        e1 = e2.cross(n).normalized()
        c = sh.lerp(el, 0.36)
        hit, _ = surface.hit(c + n * 0.2, -n)
        surf_c = (hit if hit is not None else c) + n * 0.0115
        if sx > 0:
            # bayrak: üst mavi, alt sarı
            for cell, v0, v1 in (("blue", 0.0, 0.026), ("yellow", -0.026, 0.0)):
                quad = [(-0.04, v0), (0.04, v0), (0.04, v1), (-0.04, v1)]
                part.add(polygon_patch(quad, surf_c, e1, e2, n, 1.0), "UA_Insignia", uv_const=insignia_uv(cell), smooth=False)
        else:
            part.add(polygon_patch(SHIELD, surf_c, e1, e2, n, 0.024), "UA_Insignia", uv_const=insignia_uv("blue"), smooth=False)
            for poly in TRYZUB:
                part.add(polygon_patch(poly, surf_c + n * 0.0008, e1, e2, n, 0.019), "UA_Insignia", uv_const=insignia_uv("yellow"), smooth=False)
        # sarı tanıma bantları: üst kol ve uyluk
        part.add(limb_band(surface, sh, el, 0.74, 0.84, 0.002, 0.003, ray_r=0.12), "UA_Insignia", uv_const=insignia_uv("tape"))
        hp, kn = mx(HIP, sx), mx(KNEE, sx)
        part.add(limb_band(surface, hp, kn, 0.71, 0.77, 0.002, 0.003, ray_r=0.15), "UA_Insignia", uv_const=insignia_uv("tape"))
    # göğüste küçük bayrak (idari cep üstü)
    y = surface_y(surface, 0.0, 1.34) - 0.012 - 0.042 - 0.029
    for cell, z0, z1 in (("blue", 1.343, 1.365), ("yellow", 1.321, 1.343)):
        bm = bmesh.new()
        vs = [bm.verts.new((x, y, z)) for x, z in ((-0.033, z0), (0.033, z0), (0.033, z1), (-0.033, z1))]
        f = bm.faces.new(vs)
        f.normal_update()
        if f.normal.y > 0:
            f.normal_flip()
        part.add(bm, "UA_Insignia", uv_const=insignia_uv(cell), smooth=False)


# ---------------------------------------------------------------------------
# Kurulum
# ---------------------------------------------------------------------------


def build_reference(col_ref):
    clear_collection(col_ref)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=7.0)
    me = bpy.data.meshes.new("REF_Ground")
    bm.to_mesh(me)
    bm.free()
    ground = bpy.data.objects.new("REF_Ground", me)
    col_ref.objects.link(ground)
    ground.location = (2.0, 0.0, 0.0)
    layer = bpy.context.view_layer.layer_collection.children[col_ref.name]
    bpy.context.view_layer.active_layer_collection = layer
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=TANK_GLB)
    for o in [o for o in bpy.data.objects if o not in before]:
        if o.parent is None:
            o.location += TANK_OFFSET
        if o.name.startswith("COL_"):
            o.hide_set(True)
            o.hide_render = True


def build():
    scene = get_scene()
    col = get_collection(scene, COL_SOLDIER)
    col_ref = get_collection(scene, COL_REF)
    clear_collection(col)
    if not bpy.data.objects.get("TankRoot"):
        build_reference(col_ref)

    TEXTURES["camo"] = make_mm14_texture()
    TEXTURES["cordura"] = make_cordura_texture()
    TEXTURES["skin"] = make_skin_texture()
    TEXTURES["insignia"] = make_insignia_texture()

    root = bpy.data.objects.new("SoldierRoot", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.3
    col.objects.link(root)
    root["asset_node_id"] = f"{ASSET_ID}/SoldierRoot"
    root["asset_version"] = 1
    root["height_m"] = 1.83
    root["suggested_capsule"] = "radius 0.30 m, height 1.80 m"

    body_bm = build_body_skin(col)
    surface = Surface(body_bm.copy())

    def is_neck(f):
        c = f.calc_center_median()
        return c.z > 1.49 and math.hypot(c.x, c.y - 0.02) < 0.072

    body = Part("Body")
    uvl = body_bm.loops.layers.uv.new("UVMap")
    for f in body_bm.faces:
        if is_neck(f):
            for l in f.loops:
                l[uvl].uv = NECK_UV
    body.add(body_bm, "UA_Camo", uv_fixed=is_neck, face_mat=lambda f: "UA_Skin" if is_neck(f) else None)

    head = Part("Head")
    head.add(build_head(col), "UA_Skin", uv_fixed=True)

    gloves = Part("Gloves")
    build_gloves(gloves)

    helmet = Part("Helmet")
    build_helmet(helmet)
    headset = Part("Headset")
    build_headset(headset)
    glasses = Part("Glasses")
    build_glasses(glasses)

    carrier = Part("PlateCarrier")
    build_plate_carrier(carrier, surface)
    belt = Part("Belt")
    build_belt(belt, surface)
    uniform = Part("UniformDetails")
    build_uniform_details(uniform, surface)
    knees = Part("KneePads")
    build_knee_pads(knees, surface)
    boots = Part("Boots")
    build_boots(boots)
    insignia = Part("Insignia")
    build_insignia(insignia, surface)

    parts = [body, head, gloves, helmet, headset, glasses, carrier, belt, uniform, knees, boots, insignia]
    objs = [p.finish(col, root) for p in parts]
    surface.bm.free()
    return root, objs


def stats(objs):
    out = {"objects": {}, "triangles": 0}
    zs, xs, ys = [], [], []
    for o in objs:
        me = o.data
        me.calc_loop_triangles()
        t = len(me.loop_triangles)
        out["objects"][o.name] = {"triangles": t, "materials": [m.name for m in me.materials]}
        out["triangles"] += t
        for v in me.vertices:
            w = o.matrix_world @ v.co
            xs.append(w.x)
            ys.append(w.y)
            zs.append(w.z)
    out["bounds_m"] = {"x": [round(min(xs), 3), round(max(xs), 3)], "y": [round(min(ys), 3), round(max(ys), 3)], "z": [round(min(zs), 3), round(max(zs), 3)]}
    out["materials"] = sorted({m for o in out["objects"].values() for m in o["materials"]})
    return out


# ---------------------------------------------------------------------------
# F5 — Dışa aktarım, yeniden okuma ve doğrulama
# ---------------------------------------------------------------------------


def read_glb_json(path):
    with open(path, "rb") as fh:
        data = fh.read()
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    assert magic == b"glTF" and version == 2 and length == len(data)
    clen, ctype = struct.unpack_from("<I4s", data, 12)
    assert ctype == b"JSON"
    return json.loads(data[20:20 + clen].decode("utf-8")), len(data)


def export_and_validate(root, objs):
    scene = bpy.context.window.scene
    for sc in bpy.data.scenes:
        for vl in sc.view_layers:
            for o in sc.objects:
                o.select_set(False, view_layer=vl)
    root.hide_set(False)
    root.select_set(True)
    for o in objs:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        use_selection=True,
        use_active_scene=True,
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_animations=False,
    )
    gltf, size = read_glb_json(GLB_PATH)

    # Yeniden içe aktar (ayrı geçici sahne) ve ölç
    tmp = bpy.data.scenes.new("_UA_VALIDATE")
    bpy.context.window.scene = tmp
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=GLB_PATH)
    imported = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in imported if o.type == "MESH"]
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    tris = 0
    for o in meshes:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    zmin, zmax = min(p.z for p in pts), max(p.z for p in pts)
    glasses = [o for o in meshes if o.name.startswith("Glasses")]
    nose_y = min((o.matrix_world @ v.co).y for o in glasses for v in o.data.vertices) if glasses else None
    imported_names = sorted(o.name for o in imported)
    for o in imported:
        data = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if isinstance(data, bpy.types.Mesh) and data.users == 0:
            bpy.data.meshes.remove(data)
    bpy.data.scenes.remove(tmp)
    bpy.context.window.scene = scene

    node_ids = {n.get("name"): (n.get("extras") or {}).get("asset_node_id") for n in gltf.get("nodes", [])}
    images = gltf.get("images", [])
    checks = {
        "height_between_1_78_and_1_86_m": 1.78 <= zmax - zmin <= 1.86,
        "feet_on_ground_z0": abs(zmin) < 0.002,
        "faces_forward_minus_y_in_blender": nose_y is not None and nose_y < -0.08,
        "triangles_under_18000": tris < 18000,
        "materials_7": len(gltf.get("materials", [])) == 7,
        "all_images_embedded": all("bufferView" in im for im in images) and len(images) == 4,
        "every_node_has_asset_node_id": all(v for v in node_ids.values()),
        "root_is_SoldierRoot": any(n.get("name") == "SoldierRoot" for n in gltf.get("nodes", [])),
    }
    validation = {
        "asset": ASSET_ID,
        "glb": os.path.relpath(GLB_PATH, ROOT),
        "glb_bytes": size,
        "reimport": {
            "objects": imported_names,
            "triangles": tris,
            "z_min_m": round(zmin, 4),
            "z_max_m": round(zmax, 4),
            "glasses_front_y_m": round(nose_y, 4) if nose_y is not None else None,
        },
        "gltf": {
            "nodes": len(gltf.get("nodes", [])),
            "meshes": len(gltf.get("meshes", [])),
            "materials": sorted(m["name"] for m in gltf.get("materials", [])),
            "images": [im.get("name") for im in images],
            "generator": gltf.get("asset", {}).get("generator"),
        },
        "checks": checks,
        "passed": all(checks.values()),
    }
    with open(os.path.join(ASSET_DIR, "validation.json"), "w") as fh:
        json.dump(validation, fh, indent=2, ensure_ascii=False)
    return validation


def save_blend():
    scene = bpy.data.scenes[SCENE_NAME]
    ref = bpy.data.collections.get(COL_REF)
    linked = ref is not None and ref.name in scene.collection.children
    if linked:
        scene.collection.children.unlink(ref)
    try:
        bpy.data.libraries.write(BLEND_PATH, {scene}, fake_user=True, compress=True)
    finally:
        if linked:
            scene.collection.children.link(ref)


RUN = globals().get("UA_RUN", "build")
if RUN in ("build", "export"):
    _root, _objs = build()
    _stats = stats(_objs)
    print(json.dumps({k: v for k, v in _stats.items() if k != "objects"}))
    for name, s in _stats["objects"].items():
        print(f"  {name}: {s['triangles']} tris {s['materials']}")
    with open(os.path.join(ASSET_DIR, "model_stats.json"), "w") as fh:
        json.dump(_stats, fh, indent=2, ensure_ascii=False)
if RUN == "export":
    _val = export_and_validate(_root, _objs)
    save_blend()
    print(json.dumps(_val["checks"]), "passed=", _val["passed"], "bytes=", _val["glb_bytes"], "reimport_tris=", _val["reimport"]["triangles"])
