"""IRON DUST 02 — baked realistic PBR texture set (original procedural shaders, no third-party textures).
Run through Blender MCP after build_second_tank_v2.py STAGE='rebuild', with STAGE defined before this file:
  'uv'     unwrap every visible part (track belts excluded) into one shared atlas; road wheels share UVs.
  'masks'  bake AO / edge / cavity masks (2048) that drive the paint layers.
  'color'  bake base colour (4096): mottled sand paint, edge chips, grime streaks, dust, mud, cavity AO.
  'orm'    bake glTF ORM (2048): R occlusion, G roughness, B metallic.
  'normal' bake tangent-space normal (4096): rounded edges, paint grain, chip dents, canvas weave.
  'apply'  swap parts to ID02_Baked (references the saved textures), then save.
Afterwards run build_second_tank_v2.py with STAGE='export'.
Track belts keep ID02_Graphite: the game replaces their material with the animated tread shader.
Units: metres; layers use world position at rest pose (z up, ground at z=0).
"""
import bpy, math, json
from pathlib import Path

OUT = Path('/home/mami/Projects/d3/assets/tanks/iron_dust_02')
TEX = OUT / 'textures'
scene = bpy.data.scenes['IRON_DUST_02']
bpy.context.window.scene = scene
asset = bpy.data.collections['ID02_Asset']
WHEEL_REP = 'Left_RoadWheel_01'
SIZES = {'masks': 2048, 'color': 4096, 'orm': 2048, 'normal': 4096}
FILES = {'masks': 'id02_masks.png', 'color': 'id02_basecolor.webp', 'orm': 'id02_orm.webp', 'normal': 'id02_normal.webp'}
SAMPLES = {'masks': 160, 'color': 4, 'orm': 4, 'normal': 12}

def lin(hexcolor):
    h = hexcolor.lstrip('#'); s = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in s]

# Layer strengths per source material. chip: paint loss on edges, dust/mud/grime: weathering amount.
SPEC = {
    'Sand':       dict(c='#B8A47E', r=.66, m=0., chip=1., dust=1., mud=1., grime=1.),
    'ArmorShade': dict(c='#9A8866', r=.68, m=0., chip=1., dust=1., mud=1., grime=1.),
    'Dust':       dict(c='#C3B290', r=.92, m=0., chip=.3, dust=1.4, mud=1.2, grime=.6),
    'Graphite':   dict(c='#3A3D3D', r=.55, m=.25, chip=.8, dust=.8, mud=1., grime=.8),
    'Rubber':     dict(c='#1C1D1E', r=.9, m=0., chip=0., dust=1.2, mud=1.3, grime=.4),
    'Optics':     dict(c='#1D3F47', r=.06, m=.3, chip=0., dust=.15, mud=0., grime=.1),
    'BareMetal':  dict(c='#8C897E', r=.38, m=.85, chip=0., dust=.6, mud=.8, grime=1.),
    'Recess':     dict(c='#141618', r=.85, m=0., chip=0., dust=.5, mud=.6, grime=.3),
    'Canvas':     dict(c='#5D5A43', r=.95, m=0., chip=0., dust=1.1, mud=.6, grime=.7, weave=1.),
}
PRIMER, STEEL, DUST, MUD, GRIME = lin('#4A4639'), lin('#77756E'), lin('#C9B794'), lin('#4B3D2B'), lin('#3E3528')

def parts():
    return [o for o in asset.objects if o.type == 'MESH' and not o.hide_render and 'TrackBelt' not in o.name]
def wheel_rep(o):
    """Representative object whose UVs a road wheel copy reuses, or None."""
    if 'RoadWheel' not in o.name or o.name.startswith(WHEEL_REP): return None
    return bpy.data.objects[WHEEL_REP + ('_Details' if o.name.endswith('_Details') else '')]
def bake_parts():
    return [o for o in parts() if wheel_rep(o) is None]

def object_mode():
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
def select(objs):
    object_mode(); bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

def original_slots(o):
    """Source material names per slot; survives the 'apply' swap so the set can be rebaked."""
    if 'id02_paint_slots' not in o: o['id02_paint_slots'] = json.dumps([m.name for m in o.data.materials])
    return json.loads(o['id02_paint_slots'])

# ---------- UV atlas ----------
def stage_uv():
    for o in parts():
        me = o.data
        while me.uv_layers: me.uv_layers.remove(me.uv_layers[0])
        me.uv_layers.new(name='UVMap')
    reps = bake_parts(); select(reps)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, margin_method='FRACTION', margin=0.003, shape_method='CONCAVE')
    object_mode()
    for o in parts():
        rep = wheel_rep(o)
        if rep is None: continue
        assert len(o.data.loops) == len(rep.data.loops), o.name
        src = [0.0] * (2 * len(rep.data.loops)); rep.data.uv_layers[0].data.foreach_get('uv', src)
        o.data.uv_layers[0].data.foreach_set('uv', src)

# ---------- node helpers ----------
class G:
    def __init__(self, mat):
        mat.use_nodes = True; self.nt = mat.node_tree; self.nt.nodes.clear(); self.x = 0
    def n(self, kind, **props):
        node = self.nt.nodes.new(kind); node.location = (self.x, 0); self.x += 40
        for k, v in props.items(): setattr(node, k, v)
        return node
    def link(self, value, sock):
        if isinstance(value, bpy.types.NodeSocket): self.nt.links.new(value, sock)
        else: sock.default_value = value
    def math(self, op, a, b=0.0, clamp=False):
        node = self.n('ShaderNodeMath', operation=op, use_clamp=clamp)
        self.link(a, node.inputs[0]); self.link(b, node.inputs[1]); return node.outputs[0]
    def add(self, *xs, clamp=False):
        out = xs[0]
        for x in xs[1:]: out = self.math('ADD', out, x, clamp)
        return out
    def mul(self, a, b, clamp=False): return self.math('MULTIPLY', a, b, clamp)
    def mr(self, x, a, b, c=0.0, d=1.0):
        node = self.n('ShaderNodeMapRange', clamp=True)
        self.link(x, node.inputs['Value']); node.inputs['From Min'].default_value = a; node.inputs['From Max'].default_value = b
        node.inputs['To Min'].default_value = c; node.inputs['To Max'].default_value = d; return node.outputs['Result']
    def mix(self, fac, a, b, data='RGBA'):
        node = self.n('ShaderNodeMix', data_type=data, clamp_factor=True)
        key = {'RGBA': 'Color', 'FLOAT': 'Float'}[data]
        ins = {s.identifier: s for s in node.inputs}
        self.link(fac, ins['Factor_Float']); self.link(a, ins['A_' + key]); self.link(b, ins['B_' + key])
        return next(s for s in node.outputs if s.identifier == 'Result_' + key)
    def noise(self, vec, scale, detail=4.0, rough=.55):
        node = self.n('ShaderNodeTexNoise', noise_dimensions='3D')
        self.link(vec, node.inputs['Vector']); node.inputs['Scale'].default_value = scale
        node.inputs['Detail'].default_value = detail; node.inputs['Roughness'].default_value = rough
        return node.outputs['Fac']
    def vscale(self, vec, s):
        node = self.n('ShaderNodeVectorMath', operation='MULTIPLY'); self.link(vec, node.inputs[0]); node.inputs[1].default_value = s
        return node.outputs[0]
    def xyz(self, vec):
        node = self.n('ShaderNodeSeparateXYZ'); self.link(vec, node.inputs[0]); return node.outputs
    def image(self, img, colorspace):
        node = self.n('ShaderNodeTexImage', image=img); img.colorspace_settings.name = colorspace; return node
    def out(self, shader):
        node = self.n('ShaderNodeOutputMaterial', target='CYCLES'); self.link(shader, node.inputs['Surface']); return node
    def emit(self, color):
        node = self.n('ShaderNodeEmission'); self.link(color, node.inputs['Color']); node.inputs['Strength'].default_value = 1.0
        return node.outputs[0]
    def rgb(self, r, g, b):
        node = self.n('ShaderNodeCombineColor'); self.link(r, node.inputs[0]); self.link(g, node.inputs[1]); self.link(b, node.inputs[2])
        return node.outputs[0]

def target_image(stage):
    name = 'ID02_' + stage; size = SIZES[stage]
    img = bpy.data.images.get(name)
    if img is None or tuple(img.size) != (size, size):
        if img: bpy.data.images.remove(img)
        img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'sRGB' if stage == 'color' else 'Non-Color'
    return img

def set_target(g, img):
    node = g.n('ShaderNodeTexImage', image=img); g.nt.nodes.active = node; node.select = True

# ---------- shaders ----------
def mask_material(img):
    m = bpy.data.materials.get('ID02B_Masks') or bpy.data.materials.new('ID02B_Masks'); g = G(m)
    ao_far = g.n('ShaderNodeAmbientOcclusion', samples=16); ao_far.inputs['Distance'].default_value = .8
    ao_near = g.n('ShaderNodeAmbientOcclusion', samples=16); ao_near.inputs['Distance'].default_value = .07
    bevel = g.n('ShaderNodeBevel', samples=12); bevel.inputs['Radius'].default_value = .02
    geo = g.n('ShaderNodeNewGeometry')
    dot = g.n('ShaderNodeVectorMath', operation='DOT_PRODUCT')
    g.link(bevel.outputs['Normal'], dot.inputs[0]); g.link(geo.outputs['True Normal'], dot.inputs[1])
    edge = g.mr(g.math('SUBTRACT', 1.0, dot.outputs['Value']), .0, .12)
    g.out(g.emit(g.rgb(ao_far.outputs['AO'], edge, ao_near.outputs['AO']))); set_target(g, img)
    return m

def paint_material(name, stage, img):
    s = SPEC[name]; base = lin(s['c'])
    m = bpy.data.materials.get('ID02B_' + name) or bpy.data.materials.new('ID02B_' + name); g = G(m)
    geo = g.n('ShaderNodeNewGeometry'); pos = geo.outputs['Position']
    nz = g.xyz(geo.outputs['True Normal'])[2]; pz = g.xyz(pos)[2]
    masks = g.image(bpy.data.images['ID02_masks'], 'Non-Color')
    sep = g.n('ShaderNodeSeparateColor'); g.link(masks.outputs['Color'], sep.inputs[0])
    ao, edge, cav_open = sep.outputs[0], sep.outputs[1], sep.outputs[2]
    n_large = g.noise(pos, .35, 3, .5); n_mid = g.noise(pos, 3.2, 6, .6); n_fine = g.noise(pos, 30, 3, .5)
    n_streak = g.noise(g.vscale(pos, (1, 1, .18)), 4, 2, .4)
    cav = g.mr(cav_open, .92, .45)

    # paint: low-frequency mottling and fine grain
    dark = [v * k for v, k in zip(base, (.80, .82, .86))]; light = [v * k for v, k in zip(base, (1.07, 1.05, 1.0))]
    col = g.mix(g.mr(n_large, .3, .7), (*dark, 1), (*light, 1))
    col = g.mix(g.mul(g.mr(n_fine, .35, .65), .22), col, (*dark, 1))
    rough = g.add(s['r'], g.mul(g.math('SUBTRACT', n_mid, .5), .14)); metal = s['m']
    # edge chips: primer first, bare steel at the worn centre
    wear = g.add(g.mul(edge, 1.5), g.mul(g.math('SUBTRACT', g.add(g.mul(n_mid, .6), g.mul(n_fine, .4)), .5), 1.4))
    chip = g.mul(g.mr(wear, .42, .47), s['chip']); steel = g.mul(g.mr(wear, .68, .73), s['chip'])
    col = g.mix(chip, col, (*PRIMER, 1)); col = g.mix(steel, col, (*STEEL, 1))
    rough = g.mix(chip, rough, .72, 'FLOAT'); rough = g.mix(steel, rough, .34, 'FLOAT')
    metal = g.mix(steel, metal, .9, 'FLOAT')
    # grime: vertical rain streaks on side faces plus cavity dirt
    side = g.mr(g.math('ABSOLUTE', nz), .6, .2)
    grime = g.mul(g.add(g.mul(g.mul(g.mr(n_streak, .58, .8), side), .22), g.mul(cav, .7), clamp=True), s['grime'])
    col = g.mix(grime, col, (*GRIME, 1)); rough = g.mix(grime, rough, g.add(s['r'], .08), 'FLOAT')
    # dust: settles on upward faces, near the ground and in cavities, broken up by noise
    up = g.mul(g.mr(nz, .3, .85), g.mr(g.add(n_large, g.mul(n_mid, .3)), .4, .78))
    low = g.mr(pz, 1.35, .3)
    dust_amt = g.mul(g.add(g.mul(up, .7), g.mul(low, .75), g.mul(cav, .35), clamp=True), s['dust'])
    dust = g.mr(g.add(dust_amt, g.mul(g.math('SUBTRACT', n_fine, .5), .5)), .3, .8)
    col = g.mix(dust, col, (*DUST, 1)); rough = g.mix(dust, rough, .95, 'FLOAT'); metal = g.mix(dust, metal, 0., 'FLOAT')
    # mud: dark caked soil on the running gear and lower hull
    mud = g.mul(g.mul(g.mr(pz, .85, .2), g.mr(g.add(n_mid, g.mul(n_fine, .25)), .42, .58)), min(s['mud'], 1.0))
    col = g.mix(mud, col, (*MUD, 1)); rough = g.mix(mud, rough, .82, 'FLOAT'); metal = g.mix(mud, metal, 0., 'FLOAT')
    # baked occlusion only lightly in albedo; the ORM red channel carries the full AO
    col = g.mix(g.mr(ao, 1., .2, 0., .45), col, (0, 0, 0, 1))

    if stage == 'color': g.out(g.emit(col))
    elif stage == 'orm': g.out(g.emit(g.rgb(ao, rough, metal)))
    elif stage == 'normal':
        height = g.add(g.mul(n_fine, .25), g.mul(n_mid, .5), g.mul(chip, -.7), g.mul(dust, .35), g.mul(mud, .8))
        if s.get('weave'):
            wave = g.n('ShaderNodeTexWave', wave_type='BANDS', bands_direction='DIAGONAL')
            g.link(pos, wave.inputs['Vector']); wave.inputs['Scale'].default_value = 60
            height = g.add(height, g.mul(wave.outputs['Fac'], .4))
        bevel = g.n('ShaderNodeBevel', samples=8); bevel.inputs['Radius'].default_value = .012
        bump = g.n('ShaderNodeBump'); bump.inputs['Strength'].default_value = .45; bump.inputs['Distance'].default_value = .002
        g.link(height, bump.inputs['Height']); g.link(bevel.outputs['Normal'], bump.inputs['Normal'])
        bsdf = g.n('ShaderNodeBsdfPrincipled'); g.link(bump.outputs['Normal'], bsdf.inputs['Normal'])
        g.out(bsdf.outputs[0])
    set_target(g, img)
    return m

# ---------- bake ----------
def swap_slots(objs, pick):
    for o in objs:
        for i, name in enumerate(original_slots(o)): o.data.materials[i] = pick(name)

def restore_slots(objs):
    for o in objs:
        for i, name in enumerate(original_slots(o)): o.data.materials[i] = bpy.data.materials[name]

def bake(stage):
    img = target_image(stage); objs = bake_parts()
    for o in parts(): original_slots(o)
    if stage == 'masks':
        mm = mask_material(img); swap_slots(objs, lambda name: mm)
    else:
        mats = {k: paint_material(k, stage, img) for k in SPEC}
        swap_slots(objs, lambda name: mats[name.removeprefix('ID02_')])
    scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'
    scene.cycles.samples = SAMPLES[stage]; scene.cycles.use_denoising = False
    scene.render.bake.margin = 12; scene.render.bake.margin_type = 'EXTEND'; scene.render.bake.use_clear = True
    select(objs)
    try:
        if stage == 'normal':
            bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT', uv_layer='UVMap')
        else:
            bpy.ops.object.bake(type='EMIT', uv_layer='UVMap')
    finally:
        restore_slots(objs)
    TEX.mkdir(exist_ok=True)
    path = TEX / FILES[stage]
    img.filepath_raw = str(path); img.file_format = 'WEBP' if path.suffix == '.webp' else 'PNG'
    scene.render.image_settings.quality = 92
    img.save(quality=92) if path.suffix == '.webp' else img.save()
    img.filepath = str(path); img.reload()
    return str(path)

# ---------- final glTF material ----------
def gltf_output_group():
    grp = bpy.data.node_groups.get('glTF Material Output')
    if grp is None:
        grp = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        grp.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    return grp

def stage_apply():
    m = bpy.data.materials.get('ID02_Baked') or bpy.data.materials.new('ID02_Baked'); g = G(m)
    load = lambda st: bpy.data.images.load(str(TEX / FILES[st]), check_existing=True)
    base = g.image(load('color'), 'sRGB'); orm = g.image(load('orm'), 'Non-Color'); nrm = g.image(load('normal'), 'Non-Color')
    sep = g.n('ShaderNodeSeparateColor'); g.link(orm.outputs['Color'], sep.inputs[0])
    nmap = g.n('ShaderNodeNormalMap', space='TANGENT', uv_map='UVMap'); g.link(nrm.outputs['Color'], nmap.inputs['Color'])
    bsdf = g.n('ShaderNodeBsdfPrincipled')
    g.link(base.outputs['Color'], bsdf.inputs['Base Color']); g.link(sep.outputs[1], bsdf.inputs['Roughness'])
    g.link(sep.outputs[2], bsdf.inputs['Metallic']); g.link(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    out = g.n('ShaderNodeOutputMaterial', target='ALL'); g.link(bsdf.outputs[0], out.inputs['Surface'])
    grp = g.n('ShaderNodeGroup', node_tree=gltf_output_group()); g.link(sep.outputs[0], grp.inputs['Occlusion'])
    m.diffuse_color = (*lin('#B8A47E'), 1)
    for o in parts():
        original_slots(o)
        for i in range(len(o.data.materials)): o.data.materials[i] = m
    for name in SPEC: bpy.data.materials['ID02_' + name].use_fake_user = True  # kept for rebakes
    bpy.context.view_layer.update(); bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'iron_dust_02.blend'))

if STAGE == 'uv': stage_uv(); RESULT = len(bake_parts())
elif STAGE in SIZES:
    if STAGE != 'masks' and 'ID02_masks' not in bpy.data.images:
        bpy.data.images.load(str(TEX / FILES['masks'])).name = 'ID02_masks'
    RESULT = bake(STAGE)
elif STAGE == 'apply': stage_apply(); RESULT = 'applied'
else: raise ValueError(STAGE)
print(STAGE, RESULT)
