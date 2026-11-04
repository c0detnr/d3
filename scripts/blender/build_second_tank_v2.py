"""IRON DUST 02 v2 — more realistic Leopard 2A6-inspired redesign (original geometry, no brand assets).
Run through Blender MCP with STAGE='rebuild' or STAGE='export' defined before this file.
Contract kept from v1 so physics and gameplay stay unchanged:
  road wheel centres (x ±1.55, y -2.52..2.52 step 0.84, z 0.63), TurretPivot (0,-0.45,1.83),
  GunPitchPivot (0,-1.66,2.43), MuzzlePoint y -7.135, COL_Hull box, node names and extras.
Units: metres. Blender forward -Y, up +Z.
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector, Euler

OUT = Path('/home/mami/Projects/d3/assets/tanks/iron_dust_02')
scene = bpy.data.scenes['IRON_DUST_02']
bpy.context.window.scene = scene
asset = bpy.data.collections.get('ID02_Asset') or bpy.data.collections.new('ID02_Asset')
if asset.name not in scene.collection.children: scene.collection.children.link(asset)

# Painted armour is dielectric; only bare steel is metallic.
PALETTE = {
    'Sand': ('#B8A47E', 0.0, .80), 'ArmorShade': ('#9A8866', 0.0, .82), 'Dust': ('#CBBC9C', 0.0, .96),
    'Graphite': ('#3A3D3D', .55, .60), 'Rubber': ('#1A1C1D', 0.0, .93), 'Optics': ('#22474F', .30, .10),
    'BareMetal': ('#8C897E', .80, .40), 'Recess': ('#111417', 0.0, .90), 'Canvas': ('#5D5A43', 0.0, .97),
}
def mat(name):
    hexcolor, metal, rough = PALETTE[name]
    h = hexcolor.lstrip('#'); srgb = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    rgb = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb]
    m = bpy.data.materials.get('ID02_' + name) or bpy.data.materials.new('ID02_' + name)
    m.use_nodes = True; m.diffuse_color = (*rgb, 1)
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*rgb, 1); p.inputs['Metallic'].default_value = metal; p.inputs['Roughness'].default_value = rough
    return m
M = {k: mat(k) for k in PALETTE}

# ---------- geometry generators: return (verts, faces) in local space ----------
def g_box(sx, sy, sz):
    x, y, z = sx / 2, sy / 2, sz / 2
    v = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    return v, [(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
def ccw(outline):
    area = sum(outline[i][0]*outline[(i+1)%len(outline)][1] - outline[(i+1)%len(outline)][0]*outline[i][1] for i in range(len(outline)))
    return outline if area > 0 else list(reversed(outline))
def g_loft(levels):
    """levels: [(xy outline, z), ...] same vertex count; outline order fixed to CCW."""
    levels = [(ccw(o), z) for o, z in levels]
    n = len(levels[0][0]); v = [(x, y, z) for o, z in levels for x, y in o]
    f = [tuple(reversed(range(n))), tuple(range((len(levels)-1)*n, len(levels)*n))]
    for k in range(len(levels)-1):
        for i in range(n): j = (i+1) % n; f.append((k*n+i, k*n+j, (k+1)*n+j, (k+1)*n+i))
    return v, f
def g_extrude_x(profile, x0, x1):
    """profile: [(y,z)] closed polygon extruded between x0 and x1."""
    p = ccw(profile); n = len(p)
    v = [(x0, y, z) for y, z in p] + [(x1, y, z) for y, z in p]
    f = [tuple(range(n)), tuple(reversed(range(n, 2*n)))]
    for i in range(n): j = (i+1) % n; f.append((i, n+i, n+j, j))
    return v, f
def g_lathe(profile, n=24, axis='Y'):
    """profile: [(t, r)] along axis; closed with caps at both ends."""
    v = []
    for t, r in profile:
        for i in range(n):
            a = i * math.tau / n; u, w = r*math.cos(a), r*math.sin(a)
            v.append((t, u, w) if axis == 'X' else ((u, t, w) if axis == 'Y' else (u, w, t)))
    f = []
    for k in range(len(profile)-1):
        for i in range(n): j = (i+1) % n; f.append((k*n+i, k*n+j, (k+1)*n+j, (k+1)*n+i))
    f += [tuple(range(n)), tuple(reversed(range((len(profile)-1)*n, len(profile)*n)))]
    return v, f
def g_cyl(r, depth, axis='Z', n=24, inner=0):
    if not inner: return g_lathe([(-depth/2, r), (depth/2, r)], n, axis)
    v = []
    def p(a, rad, t):
        u, w = rad*math.cos(a), rad*math.sin(a)
        return (t, u, w) if axis == 'X' else ((u, t, w) if axis == 'Y' else (u, w, t))
    for rad in (r, inner):
        for t in (-depth/2, depth/2): v.extend(p(i*math.tau/n, rad, t) for i in range(n))
    f = []
    for i in range(n):
        j = (i+1) % n
        f += [(i, j, n+j, n+i), (2*n+j, 2*n+i, 3*n+i, 3*n+j), (i, 2*n+i, 2*n+j, j), (n+j, 3*n+j, 3*n+i, n+i)]
    return v, f
def rot(geom, euler):
    m = Euler(euler).to_matrix(); return [tuple(m @ Vector(p)) for p in geom[0]], geom[1]
def move(geom, d):
    return [(x+d[0], y+d[1], z+d[2]) for x, y, z in geom[0]], geom[1]
def join(*geoms):
    v, f = [], []
    for gv, gf in geoms:
        o = len(v); v += list(gv); f += [tuple(o+i for i in face) for face in gf]
    return v, f

# ---------- scene helpers ----------
def find(name): return next((o for o in asset.objects if o.get('asset_node_id') == name), None)
def attach(o, name, parent, material, loc):
    o.name = name; o['asset_node_id'] = name
    if o.name not in asset.objects: asset.objects.link(o)
    o.parent = parent
    o.location = Vector(loc) - (parent.matrix_world.translation if parent else Vector())
    if material: o.data.materials.append(material)
    bpy.context.view_layer.update(); return o
def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None); o.empty_display_size = .15
    return attach(o, name, parent, None, loc)
def part(name, geom, parent, material, loc=(0, 0, 0), bevel=0.0, world=False):
    """world=True: geom verts are world coordinates; object origin set to loc."""
    v, f = geom
    if world: v = [(x-loc[0], y-loc[1], z-loc[2]) for x, y, z in v]
    d = bpy.data.meshes.new(name); d.from_pydata(v, [], f); d.update()
    bm = bmesh.new(); bm.from_mesh(d); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(d); bm.free()
    o = attach(bpy.data.objects.new(name, d), name, parent, material, loc)
    if bevel:
        mod = o.modifiers.new('chamfer', 'BEVEL'); mod.width = bevel; mod.segments = 1; mod.limit_method = 'ANGLE'
        deps = bpy.context.evaluated_depsgraph_get(); new = bpy.data.meshes.new_from_object(o.evaluated_get(deps), depsgraph=deps)
        o.modifiers.clear(); old = o.data; o.data = new
        if old.users == 0: bpy.data.meshes.remove(old)
    return o
def box(name, loc, size, parent, material, bevel=.012, euler=None):
    g = g_box(*size)
    if euler: g = rot(g, euler)
    return part(name, g, parent, material, loc, bevel)
def cyl(name, loc, r, depth, parent, material, axis='Z', n=16, inner=0, euler=None):
    g = g_cyl(r, depth, axis, n, inner)
    if euler: g = rot(g, euler)
    return part(name, g, parent, material, loc)

def stats():
    visible = [o for o in asset.objects if o.type == 'MESH' and not o.get('collision_only')]
    for o in visible: o.data.calc_loop_triangles()
    pts = [o.matrix_world @ Vector(c) for o in visible for c in o.bound_box]
    return {'stage': STAGE, 'version': 2, 'unit': 'metre', 'forward_axis_blender': '-Y', 'up_axis_blender': '+Z', 'road_wheels': 14,
            'materials': len({m.name for o in visible for m in o.data.materials}), 'collision_triangles': 12, 'visible_meshes': len(visible),
            'visible_triangles': sum(len(o.data.loop_triangles) for o in visible),
            'bounds_min': [min(p[i] for p in pts) for i in range(3)], 'bounds_max': [max(p[i] for p in pts) for i in range(3)]}

# ---------- running gear constants (wheel centres are physics contract) ----------
WHEEL_X, WHEEL_Z, WHEEL_YS = 1.55, .63, [-2.52 + i*.84 for i in range(7)]
WHEEL_R = .418            # nearly touching neighbours like the reference; track inner face at z 0.212
TRACK_PITCH = .22         # matches the game's temporary tread shader repeat
SHOE_T, TRACK_W = .07, .66
IDLER = (-3.28, .74, .34); SPROCKET = (3.28, .80, .34)
ROLLERS = [(-1.90, 1.05, .11), (-.55, 1.07, .11), (.80, 1.08, .11), (2.15, 1.08, .11)]

def track_path():
    """Inner track surface around idler, wheels, sprocket and return rollers; CCW in (y,z)."""
    pts = []
    circles = [IDLER, SPROCKET] + [(y, WHEEL_Z, WHEEL_R) for y in WHEEL_YS] + ROLLERS
    for cy, cz, r in circles:
        pts += [(cy + r*math.cos(a*math.tau/96), cz + r*math.sin(a*math.tau/96)) for a in range(96)]
    pts = sorted(set(pts))
    def cross(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0: lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0: upper.pop()
        upper.append(p)
    hull = lower[:-1] + upper[:-1]
    seg = [math.dist(hull[i], hull[(i+1) % len(hull)]) for i in range(len(hull))]
    total = sum(seg); count = round(total / TRACK_PITCH); step = total / count
    out = []; i = 0; acc = 0.0
    for k in range(count):
        s = k * step
        while acc + seg[i] < s: acc += seg[i]; i += 1
        t = (s - acc) / seg[i]; a, b = hull[i], hull[(i+1) % len(hull)]
        out.append([a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t])
    # Sag the top run between supports (idler top, rollers, sprocket top).
    supports = [IDLER[0]] + [r[0] for r in ROLLERS] + [SPROCKET[0]]
    for p in out:
        if p[1] < .95 or not (supports[0] < p[0] < supports[-1]): continue
        for a, b in zip(supports, supports[1:]):
            if a <= p[0] <= b:
                p[1] -= .035 * math.sin(math.pi * (p[0]-a) / (b-a)); break
    return out, step

def build_track(side, x, parent):
    path, step = track_path(); n = len(path)
    v, f, uvv = [], [], []
    def add(geom, centre, ty, tz, ny, nz, s_centre):
        o = len(v)
        for px, py, pz in geom[0]:
            # local: px across, py along tangent, pz along outward normal
            wy = centre[0] + ty*py + ny*pz; wz = centre[1] + tz*py + nz*pz
            v.append((x + px, wy, wz)); uvv.append(((px + TRACK_W/2) / TRACK_W, 1 - (s_centre + py) / .22))
        f.extend(tuple(o+i for i in face) for face in geom[1])
    for k in range(n):
        p0, p1, pm = path[k], path[(k+1) % n], path[k-1]
        ty, tz = p1[0]-pm[0], p1[1]-pm[1]; L = math.hypot(ty, tz); ty, tz = ty/L, tz/L
        ny, nz = tz, -ty   # outward for CCW path
        s = k * step
        add(move(g_box(TRACK_W, step*.86, SHOE_T), (0, 0, SHOE_T/2)), p0, ty, tz, ny, nz, s)                 # shoe plate
        add(move(g_box(.065, .07, .095), (0, 0, -.045)), p0, ty, tz, ny, nz, s)                               # guide horn
        for sx in (-1, 1):                                                                                     # end connectors
            add(move(g_box(.06, .085, SHOE_T + .03), (sx*(TRACK_W/2 + .02), step/2, SHOE_T/2)), p0, ty, tz, ny, nz, s + step/2)
    belt = part(side + '_TrackBelt', (v, f), parent, M['Graphite'])
    uv = belt.data.uv_layers.new(name='TrackTravel')
    for poly in belt.data.polygons:
        for li in poly.loop_indices: uv.data[li].uv = uvv[belt.data.loops[li].vertex_index]
    belt['uv_travel_axis'] = 'V'; belt['uv_metres_per_repeat'] = .22
    return belt

def build_wheel(side, i, x, y, parent):
    s = -1 if x < 0 else 1
    tyres = join(move(g_cyl(WHEEL_R, .17, 'X', 20, .335), (-.145, 0, 0)), move(g_cyl(WHEEL_R, .17, 'X', 20, .335), (.145, 0, 0)))
    w = part(f'{side}_RoadWheel_{i+1:02}', tyres, parent, M['Rubber'], (x, y, WHEEL_Z))
    # Outer disc only; the inner half is hidden behind it.
    cyl(f'{side}_WheelDiscOut_{i}', (x + s*.145, y, WHEEL_Z), .338, .15, w, M['Sand'], 'X', 20)
    cyl(f'{side}_WheelDish_{i}', (x + s*.226, y, WHEEL_Z), .25, .02, w, M['ArmorShade'], 'X', 16)
    cyl(f'{side}_WheelHub_{i}', (x + s*.25, y, WHEEL_Z), .135, .07, w, M['Graphite'], 'X', 12)
    cyl(f'{side}_WheelCap_{i}', (x + s*.29, y, WHEEL_Z), .07, .03, w, M['BareMetal'], 'X', 8)
    for k in range(6):
        a = k*math.tau/6 + .26
        cyl(f'{side}_WheelBolt_{i}_{k}', (x + s*.287, y + .10*math.cos(a), WHEEL_Z + .10*math.sin(a)), .02, .025, w, M['BareMetal'], 'X', 6)
    return w

def build_sprocket_or_idler(side, label, x, centre, parent, teeth):
    cy, cz, r = centre; s = -1 if x < 0 else 1
    body = join(move(g_cyl(r, .16, 'X', 20), (-.145, 0, 0)), move(g_cyl(r, .16, 'X', 20), (.145, 0, 0)), g_cyl(.17, .30, 'X', 12))
    o = part(f'{side}_{label}', body, parent, M['Graphite'] if teeth else M['Sand'], (x, cy, cz))
    cyl(f'{side}_{label}Face', (x + s*.23, cy, cz), r*.72, .03, o, M['ArmorShade'], 'X', 18, inner=r*.32)
    cyl(f'{side}_{label}Hub', (x + s*.25, cy, cz), .11, .06, o, M['BareMetal'], 'X', 12)
    if teeth:
        for k in range(12):
            a = k*math.tau/12
            for dx in (-.145, .145):
                g = rot(g_box(.15, .07, .08), (a, 0, 0))
                part(f'{side}_{label}Tooth_{k}_{dx}', move(g, (0, (r+.03)*math.cos(a), (r+.03)*math.sin(a))), o, M['Graphite'], (x+dx, cy, cz))
    else:
        for k in range(6):
            a = k*math.tau/6
            cyl(f'{side}_{label}Hole_{k}', (x + s*.235, cy + r*.52*math.cos(a), cz + r*.52*math.sin(a)), .045, .02, o, M['Recess'], 'X', 8)
    return o

# ---------- hull ----------
def build_hull(root):
    lower = g_extrude_x([(-3.22, .46), (3.20, .46), (3.62, .86), (3.62, 1.32), (-3.80, 1.32), (-3.82, 1.10)], -1.14, 1.14)
    upper = g_extrude_x([(-3.84, 1.30), (3.62, 1.30), (3.62, 1.62), (3.52, 1.70), (-2.38, 1.70), (-3.97, 1.24)], -1.90, 1.90)
    hull = part('Hull', join(lower, upper), root, M['Sand'], (0, 0, 0), bevel=.02)
    panels = empty('ArmorPanels', (0, 0, 0), hull); skirts = empty('SideSkirts', (0, 0, 0), hull)
    engine = empty('EngineDeck', (0, 0, 0), hull); exhaust = empty('Exhausts', (0, 0, 0), hull)
    # Glacis and front: weld seam, driver station on the right, light guards, tow hooks.
    box('GlacisSeam', (0, -3.18, 1.47), (3.70, .035, .02), panels, M['ArmorShade'], 0, euler=(math.atan2(.46, 1.59), 0, 0))
    box('DriverHatch', (.62, -2.02, 1.725), (.62, .70, .05), panels, M['ArmorShade'], .02)
    box('DriverHatchHinge', (.62, -1.64, 1.74), (.42, .06, .05), panels, M['Graphite'], .01)
    for k, dx in enumerate((-.20, 0, .20)):
        box(f'DriverPeriscope_{k}', (.62 + dx, -2.46, 1.71), (.15, .12, .10), panels, M['Graphite'], .01)
        box(f'DriverPeriscopeGlass_{k}', (.62 + dx, -2.525, 1.715), (.11, .012, .05), panels, M['Optics'], 0)
    for s in (-1, 1):
        box(f'LightGuard_{s}', (s*1.58, -3.66, 1.42), (.30, .26, .20), panels, M['ArmorShade'], .015)
        box(f'Headlight_{s}', (s*1.58, -3.80, 1.42), (.18, .02, .09), panels, M['Optics'], .004)
        cyl(f'TowHook_{s}', (s*.85, -3.70, .96), .11, .09, panels, M['BareMetal'], 'Y', 12, inner=.06)
        cyl(f'RearTowEye_{s}', (s*1.0, 3.66, .98), .11, .09, panels, M['BareMetal'], 'Y', 12, inner=.06)
        box(f'TailLight_{s}', (s*1.62, 3.64, 1.48), (.18, .05, .12), panels, M['Recess'], .01)
        # Sponson side weld line.
        box(f'SponsonSeam_{s}', (s*1.905, 0, 1.50), (.012, 7.0, .02), panels, M['ArmorShade'], 0)
    box('FrontLowerShackleBar', (0, -3.72, .78), (1.20, .05, .06), panels, M['Graphite'], .01, euler=(math.atan2(.55, .64), 0, 0))
    # Engine deck: access plates, side intakes, rear louvred exhaust grilles; stays below 1.80 for gun clearance.
    for s in (-1, 1):
        box(f'DeckAccessPlate_{s}', (s*.55, 2.25, 1.715), (.98, 1.40, .03), engine, M['ArmorShade'], .012)
        box(f'DeckHandle_{s}', (s*.55, 1.70, 1.74), (.20, .04, .03), engine, M['Graphite'], .005)
        box(f'IntakeBed_{s}', (s*1.42, 1.80, 1.705), (.72, 1.10, .02), engine, M['Recess'], 0)
        for k in range(7):
            box(f'IntakeBar_{s}_{k}', (s*1.42, 1.32 + k*.16, 1.725), (.70, .05, .03), engine, M['Graphite'], .004)
        box(f'ExhaustBed_{s}', (s*1.18, 3.12, 1.705), (1.30, .70, .02), engine, M['Recess'], 0)
        for k in range(5):
            box(f'ExhaustLouvre_{s}_{k}', (s*1.18, 2.84 + k*.14, 1.728), (1.26, .06, .035), exhaust, M['Graphite'], .004, euler=(math.radians(25), 0, 0))
    # Rear plate grilles and stowage box.
    for s in (-1, 1):
        box(f'RearGrille_{s}', (s*1.15, 3.635, 1.12), (.95, .03, .40), exhaust, M['Recess'], 0)
        for k in range(4):
            box(f'RearGrilleBar_{s}_{k}', (s*1.15, 3.655, .97 + k*.10), (.92, .03, .03), exhaust, M['Graphite'], .004)
    box('RearStowageBox', (0, 3.70, 1.18), (.80, .16, .34), panels, M['Sand'], .02)
    # Rear fenders.
    for s in (-1, 1):
        box(f'RearFender_{s}', (s*1.55, 3.62, 1.30), (.72, .30, .04), panels, M['Sand'], .01)
    # Side skirts: three heavy armour modules in front, thin plates with rubber flaps behind.
    for s, side in ((-1, 'Left'), (1, 'Right')):
        y = -3.78
        for k in range(3):
            box(f'{side}_HeavySkirt_{k}', (s*2.00, y + .30, 1.27), (.16, .58, .76), skirts, M['Sand'], .03)
            box(f'{side}_HeavySkirtLip_{k}', (s*2.085, y + .30, 1.58), (.012, .50, .02), skirts, M['ArmorShade'], 0)
            for bz in (1.15, 1.45):
                cyl(f'{side}_HeavyBolt_{k}_{bz}', (s*2.085, y + .12, bz), .022, .02, skirts, M['BareMetal'], 'X', 6)
                cyl(f'{side}_HeavyBolt2_{k}_{bz}', (s*2.085, y + .48, bz), .022, .02, skirts, M['BareMetal'], 'X', 6)
            y += .62
        while y < 3.30:
            length = min(.92, 3.36 - y)
            box(f'{side}_Skirt_{y:.2f}', (s*1.955, y + length/2, 1.33), (.05, length - .02, .64), skirts, M['Sand'], .012)
            box(f'{side}_SkirtFlap_{y:.2f}', (s*1.955, y + length/2, .965), (.035, length - .03, .10), skirts, M['Rubber'], .005)
            box(f'{side}_SkirtDust_{y:.2f}', (s*1.983, y + length/2, 1.06), (.012, length - .04, .09), skirts, M['Dust'], 0)
            y += length
    return hull

# ---------- turret ----------
def turret_outline(w, front, rear, fc, rc):
    return [(-w+fc, front), (w-fc, front), (w, front+fc), (w, rear-rc), (w-rc, rear), (-w+rc, rear), (-w, rear-rc), (-w, front+fc)]
def build_turret(root):
    pivot = empty('TurretPivot', (0, -.45, 1.83), root)
    TP = (0, -.45, 1.83)
    part('TurretRing', g_cyl(1.10, .12, 'Z', 32), pivot, M['Graphite'], (0, -.45, 1.77))
    body = g_loft([(turret_outline(1.38, -1.62, 1.60, .18, .45), 1.80), (turret_outline(1.52, -1.70, 1.72, .14, .50), 2.02),
                   (turret_outline(1.52, -1.70, 1.72, .14, .50), 2.70), (turret_outline(1.42, -1.62, 1.64, .12, .45), 2.80)])
    tm = part('TurretMesh', body, pivot, M['Sand'], TP, bevel=.02, world=True)
    armor = empty('TurretArmor', (0, 0, 0), pivot)
    for s, label in ((-1, 'Left'), (1, 'Right')):
        base = [(s*.46, -2.48), (s*1.56, -1.80), (s*1.56, -1.62), (s*.46, -1.62)]
        top = [(s*.46, -2.26), (s*1.56, -1.74), (s*1.56, -1.62), (s*.46, -1.62)]
        part(f'{label}_WedgeArmor', g_loft([(base, 1.92), (top, 2.70)]), armor, M['Sand'], TP, bevel=.018, world=True)
        # Turret side stowage boxes and smoke dischargers.
        box(f'{label}_SideStowage', (s*1.60, .85, 2.38), (.16, 1.40, .44), armor, M['ArmorShade'], .02)
        for k in range(3): box(f'{label}_StowageLatch_{k}', (s*1.685, .35 + k*.5, 2.45), (.012, .08, .16), armor, M['Graphite'], 0)
        box(f'{label}_SmokeBase', (s*1.58, -.15, 2.36), (.16, .46, .12), armor, M['Graphite'], .01)
        for a in range(2):
            for b in range(2):
                cyl(f'{label}_SmokeTube_{a}_{b}', (s*(1.66 + b*.02), -.30 + a*.30, 2.47 + b*.13), .055, .24, armor, M['Graphite'], 'X', 10,
                    euler=(0, s*math.radians(35), 0))
        box(f'{label}_LiftEye', (s*1.25, -1.40, 2.83), (.06, .12, .08), armor, M['Graphite'], .01)
    # Rear bustle basket with stowage.
    box('BasketFloor', (0, 2.05, 2.16), (2.70, .70, .03), armor, M['Graphite'], 0)
    for s in (-1, 1):
        box(f'BasketSideRail_{s}', (s*1.34, 2.05, 2.52), (.035, .70, .035), armor, M['Graphite'], 0)
        box(f'BasketSideRailLow_{s}', (s*1.34, 2.05, 2.34), (.03, .70, .03), armor, M['Graphite'], 0)
    for z in (2.34, 2.52): box(f'BasketRearRail_{z}', (0, 2.39, z), (2.70, .035, .035), armor, M['Graphite'], 0)
    for x in (-1.34, -.67, 0, .67, 1.34): box(f'BasketPost_{x}', (x, 2.39, 2.34), (.035, .035, .38), armor, M['Graphite'], 0)
    cyl('TarpRoll', (-.55, 2.02, 2.33), .15, 1.30, armor, M['Canvas'], 'X', 14)
    box('StowageCrate', (.75, 2.05, 2.32), (.80, .50, .30), armor, M['Canvas'], .03)
    box('CrateStrap', (.75, 2.05, 2.32), (.06, .52, .32), armor, M['Graphite'], 0)
    # Roof plates.
    box('RoofPlateFront', (0, -.95, 2.805), (1.90, .80, .015), tm, M['ArmorShade'], 0)
    box('RoofSeamRear', (0, 1.25, 2.806), (2.40, .02, .012), tm, M['ArmorShade'], 0)
    optics = empty('Optics', (0, 0, 0), pivot); hatches = empty('Hatches', (0, 0, 0), pivot)
    # Gunner's primary sight (right front) and commander's independent periscope.
    box('PrimarySightHousing', (.98, -1.18, 2.94), (.48, .64, .28), optics, M['Sand'], .03)
    box('PrimarySightWindow', (.98, -1.505, 2.94), (.34, .012, .16), optics, M['Optics'], .003)
    box('PrimarySightShutter', (.98, -1.52, 3.07), (.44, .10, .03), optics, M['ArmorShade'], .008)
    cyl('PeriscopeBase', (.38, -.42, 2.90), .21, .16, optics, M['ArmorShade'], 'Z', 20)
    cyl('PeriscopeColumn', (.38, -.42, 3.04), .12, .16, optics, M['Graphite'], 'Z', 14)
    box('PeriscopeHead', (.38, -.45, 3.23), (.34, .32, .24), optics, M['Sand'], .025)
    box('PeriscopeWindow', (.38, -.615, 3.23), (.24, .012, .13), optics, M['Optics'], .003)
    box('PeriscopeHood', (.38, -.56, 3.36), (.36, .22, .025), optics, M['ArmorShade'], .006)
    cyl('WindSensorMast', (0, 1.42, 2.98), .025, .36, optics, M['Graphite'], 'Z', 8)
    box('WindSensor', (0, 1.42, 3.18), (.16, .06, .06), optics, M['Graphite'], .01)
    # Hatches: commander (right, vision blocks) and loader (left).
    for label, x, y in (('Commander', .72, .40), ('Loader', -.70, .30)):
        cyl(label + 'HatchRing', (x, y, 2.84), .40, .09, hatches, M['ArmorShade'], 'Z', 28)
        cyl(label + 'HatchLid', (x, y, 2.90), .35, .04, hatches, M['Sand'], 'Z', 28)
        box(label + 'HatchHinge', (x, y + .36, 2.92), (.30, .06, .06), hatches, M['Graphite'], .01)
        box(label + 'HatchHandle', (x, y - .10, 2.94), (.20, .04, .04), hatches, M['BareMetal'], .008)
    for k in range(6):
        a = math.radians(200 + k*28)
        box(f'CommanderVision_{k}', (.72 + .43*math.cos(a), .40 + .43*math.sin(a), 2.92), (.13, .09, .09), hatches, M['Optics'], .006, euler=(0, 0, a + math.pi/2))
    for s in (-1, 1):
        cyl(f'AntennaBase_{s}', (s*1.08, 1.30, 2.86), .07, .14, pivot, M['Graphite'], 'Z', 10)
        cyl(f'Antenna_{s}', (s*1.08, 1.30, 3.68), .011, 1.50, pivot, M['Graphite'], 'Z', 6)
    # Gun: mantlet on pitch pivot; tube, sleeve and muzzle on recoil root.
    pitch = empty('GunPitchPivot', (0, -1.66, 2.43), pivot)
    mant = part('GunMantlet', g_loft([([(-.40, -2.22), (.40, -2.22), (.40, -1.66), (-.40, -1.66)], 2.07),
                                      ([(-.40, -2.26), (.40, -2.26), (.40, -1.66), (-.40, -1.66)], 2.79)]),
                pitch, M['Sand'], (0, -1.66, 2.43), bevel=.025, world=True)
    box('MantletCoaxPort', (-.26, -2.255, 2.36), (.08, .02, .08), mant, M['Recess'], 0)
    box('MantletSeam', (0, -2.245, 2.70), (.70, .01, .015), mant, M['ArmorShade'], 0)
    recoil = empty('GunRecoilRoot', (0, -1.66, 2.43), pitch)
    part('Barrel', g_lathe([(-1.90, .085), (-7.05, .085)], 20), recoil, M['Graphite'], (0, 0, 2.43))
    sleeve = [(-2.20, .200), (-2.34, .200), (-2.34, .145), (-3.52, .145), (-3.52, .158), (-3.60, .158), (-3.60, .145),
              (-3.66, .150), (-3.76, .186), (-4.36, .186), (-4.46, .145), (-4.46, .136), (-5.66, .136), (-5.66, .148),
              (-5.74, .148), (-5.74, .127), (-6.86, .127)]
    part('ThermalSleeve', g_lathe(sleeve, 24), recoil, M['Sand'], (0, 0, 2.43))
    part('MuzzleShroud', g_lathe([(-6.84, .102), (-7.10, .102), (-7.12, .096), (-7.13, .096)], 20), recoil, M['Graphite'], (0, 0, 2.43))
    cyl('BoreShadow', (0, -7.132, 2.43), .062, .004, recoil, M['Recess'], 'Y', 16)
    box('MuzzleRefSensor', (0, -6.97, 2.56), (.08, .14, .07), recoil, M['Graphite'], .008)
    box('MuzzleRefMount', (0, -6.97, 2.51), (.05, .05, .04), recoil, M['Graphite'], 0)
    muzzle = empty('MuzzlePoint', (0, -7.135, 2.43), recoil); muzzle['direction_local'] = [0, -1, 0]
    return pivot

PROTECTED = {'TankRoot', 'Hull', 'TurretPivot', 'TurretMesh', 'TurretArmor', 'Optics', 'Hatches', 'GunPitchPivot', 'GunMantlet',
             'GunRecoilRoot', 'Barrel', 'ThermalSleeve', 'MuzzleShroud', 'MuzzlePoint', 'ArmorPanels', 'SideSkirts', 'EngineDeck',
             'Exhausts', 'LeftTrack', 'RightTrack', 'Left_TrackBelt', 'Right_TrackBelt', 'CollisionProxies', 'COL_Hull',
             'Left_Idler', 'Right_Idler', 'Left_Sprocket', 'Right_Sprocket'}
PROTECTED |= {f'{s}_RoadWheel_{i:02}' for s in ('Left', 'Right') for i in range(1, 8)}

def merge_details():
    """One detail mesh per moving group keeps draw calls low without losing contract nodes."""
    for name in [o.name for o in asset.objects]:
        par = bpy.data.objects.get(name)
        if par is None: continue
        kids = [o for o in par.children if o.type == 'MESH' and o.get('asset_node_id') not in PROTECTED]
        if len(kids) < 2: continue
        bpy.context.view_layer.update(); inv = par.matrix_world.inverted()
        verts, faces, mats, idx = [], [], [], []
        for o in kids:
            t = inv @ o.matrix_world; off = len(verts)
            verts += [tuple(t @ v.co) for v in o.data.vertices]
            for m in o.data.materials:
                if m not in mats: mats.append(m)
            for p in o.data.polygons:
                faces.append(tuple(off + i for i in p.vertices)); idx.append(mats.index(o.data.materials[p.material_index]))
        name = par.name + '_Details'
        d = bpy.data.meshes.new(name); d.from_pydata(verts, [], faces); d.update()
        merged = attach(bpy.data.objects.new(name, d), name, par, None, tuple(par.matrix_world.translation))
        for m in mats: merged.data.materials.append(m)
        for p, i in zip(merged.data.polygons, idx): p.material_index = i
        for o in kids:
            data = o.data; bpy.data.objects.remove(o, do_unlink=True)
            if data.users == 0: bpy.data.meshes.remove(data)

def save():
    bpy.context.view_layer.update(); bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'iron_dust_02.blend'))

if STAGE == 'rebuild':
    for o in list(asset.objects):
        data = o.data; bpy.data.objects.remove(o, do_unlink=True)
        if data is not None and data.users == 0 and isinstance(data, bpy.types.Mesh): bpy.data.meshes.remove(data)
    for m in list(bpy.data.meshes):
        if m.users == 0: bpy.data.meshes.remove(m)
    root = empty('TankRoot', (0, 0, 0))
    for k, val in {'forward_axis': '-Y', 'up_axis': '+Z', 'road_wheels': 14, 'temporary_min_elevation_deg': -8,
                   'asset_status': 'v2 realistic redesign; model validated, gameplay tuning temporary'}.items(): root[k] = val
    proxies = empty('CollisionProxies', (0, 0, 0), root)
    col = box('COL_Hull', (0, 0, 1.18), (3.06, 7.15, 1.08), proxies, M['Sand'], 0)
    col['collision_only'] = True; col.hide_render = True; col.display_type = 'WIRE'
    build_hull(root)
    for side, x in (('Left', -WHEEL_X), ('Right', WHEEL_X)):
        t = empty(side + 'Track', (0, 0, 0), root)
        for i, y in enumerate(WHEEL_YS): build_wheel(side, i, x, y, t)
        build_sprocket_or_idler(side, 'Idler', x, IDLER, t, False)
        build_sprocket_or_idler(side, 'Sprocket', x, SPROCKET, t, True)
        for k, (ry, rz, rr) in enumerate(ROLLERS):
            part(f'{side}_ReturnRoller_{k}', join(move(g_cyl(rr, .14, 'X', 14), (-.13, 0, 0)), move(g_cyl(rr, .14, 'X', 14), (.13, 0, 0))),
                 t, M['Graphite'], (x, ry, rz))
        build_track(side, x, t)
    build_turret(root)
    merge_details()
    save()
elif STAGE == 'export':
    bpy.ops.object.select_all(action='DESELECT')
    for o in asset.objects: o.select_set(True)
    bpy.context.view_layer.objects.active = find('TankRoot')
    bpy.ops.export_scene.gltf(filepath=str(OUT / 'iron_dust_02.glb'), export_format='GLB', use_selection=True, use_active_scene=True,
                              export_yup=True, export_extras=True, export_apply=True, export_cameras=False, export_lights=False)
    save()
else:
    raise ValueError(STAGE)
result = stats()
(OUT / 'model_stats.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result))
