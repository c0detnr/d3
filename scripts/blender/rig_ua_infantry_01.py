"""UA Infantry v5. Run from repo: blender -b --python scripts/blender/rig_ua_infantry_01.py

Creates only the rigged GLB, rig previews and rig_validation.json; never saves over
source .blend/.glb. Blender -Y forward/Z up becomes glTF +Z forward/Y up.
"""
import hashlib
import json
import math
from pathlib import Path
import struct

import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.kdtree import KDTree

ROOT = Path(__file__).resolve().parents[2]
ASSET = ROOT / 'assets/characters/ua_infantry_01'
OUT = ASSET / 'ua_infantry_01_rigged.glb'
PREVIEWS = ASSET / 'previews'
CLIPS = {'Idle_Alert': 121, 'Idle_Smoke': 181, 'Death_Fall': 43}
V = Vector
SH = V((.185, 0, 1.43))
EL = SH + V((.395, 0, -.918)).normalized() * .30
WR = EL + V((.346, -.285, -.894)).normalized() * .25
GRIP_LOCAL = None
LIP_REFERENCE = V((-.008,-.154,1.612))
HP, KN, AN = V((.095, 0, .89)), V((.130, -.005, .52)), V((.178, .055, .105))


def side(p, sign):
    return V((sign * p.x, p.y, p.z))


def select(objects, active):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active


def build_rig(meshes, root):
    data = bpy.data.armatures.new('UA_Humanoid')
    rig = bpy.data.objects.new('UA_Humanoid', data)
    bpy.context.collection.objects.link(rig)
    rig.parent = root
    select([rig], rig)
    bpy.ops.object.mode_set(mode='EDIT')

    def bone(name, head, tail, parent=None, deform=True):
        b = data.edit_bones.new(name)
        b.head, b.tail = head, tail
        b.use_deform = deform
        if parent:
            b.parent = data.edit_bones[parent]
        return b

    bone('Root', (0, 0, 0), (0, 0, .20), deform=False)
    bone('Hips', (0, 0, .91), (0, 0, 1.03), 'Root')
    bone('Spine', (0, 0, 1.03), (0, -.005, 1.18), 'Hips')
    bone('Spine1', (0, -.005, 1.18), (0, -.01, 1.32), 'Spine')
    bone('Spine2', (0, -.01, 1.32), (0, -.015, 1.48), 'Spine1')
    bone('Neck', (0, -.015, 1.48), (0, -.025, 1.58), 'Spine2')
    bone('Head', (0, -.025, 1.58), (0, -.03, 1.77), 'Neck')
    for suffix, sign in [('L', 1), ('R', -1)]:
        sh, el, wr = [side(p, sign) for p in (SH, EL, WR)]
        tip = wr + (wr - el).normalized() * .105
        bone('Clavicle.' + suffix, (sign * .035, -.005, 1.445), sh, 'Spine2')
        bone('UpperArm.' + suffix, sh, el, 'Clavicle.' + suffix)
        bone('Forearm.' + suffix, el, wr, 'UpperArm.' + suffix)
        bone('Hand.' + suffix, wr, tip, 'Forearm.' + suffix)
        bone('Thigh.' + suffix, side(HP, sign), side(KN, sign), 'Hips')
        bone('Shin.' + suffix, side(KN, sign), side(AN, sign), 'Thigh.' + suffix)
        bone('Foot.' + suffix, side(AN, sign), (sign * .19, -.15, .045), 'Shin.' + suffix)
    wr = side(WR, -1)
    bone('Thumb.R', wr + V((.02, -.025, -.035)), wr + V((.035, -.04, -.085)), 'Hand.R')
    bone('Fingers.R', wr + V((-.023, -.022, -.072)), wr + V((-.045, -.035, -.145)), 'Hand.R')
    bpy.ops.object.mode_set(mode='OBJECT')
    body = meshes['Body']
    select([body, rig], rig)
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    assert any(m.type == 'ARMATURE' for m in body.modifiers)
    # The face/neck must follow the same rigid frame as helmet and eyewear.
    for v in body.data.vertices:
        if v.co.z >= 1.58:
            for group in body.vertex_groups:
                group.remove([v.index])
            body.vertex_groups['Head'].add([v.index], 1, 'REPLACE')
        total = sum(g.weight for g in v.groups)
        assert total > .001, f'Unweighted Body vertex {v.index}'
        for g in list(v.groups):
            body.vertex_groups[g.group].add([v.index], g.weight / total, 'REPLACE')

    tree = KDTree(len(body.data.vertices))
    for v in body.data.vertices:
        tree.insert(v.co, v.index)
    tree.balance()

    def attach(obj, assignments):
        obj.parent = rig
        obj.matrix_parent_inverse = Matrix.Identity(4)
        for name, ids in assignments.items():
            obj.vertex_groups.new(name=name).add(ids, 1, 'REPLACE')
        mod = obj.modifiers.new('UA Skin', 'ARMATURE')
        mod.object = rig

    # Source side straps were ray-fitted onto sleeves in the A-pose. Fit only
    # their lateral overhang to the torso before the arm can uncover it.
    for v in meshes['PlateCarrier'].data.vertices:
        if 1.11 < v.co.z < 1.28 and abs(v.co.x) > .175:
            v.co.x = math.copysign(.175 + .030 * math.tanh((abs(v.co.x)-.175)/.030), v.co.x)

    for name, obj in meshes.items():
        if name == 'Body':
            continue
        fixed = {'Helmet': 'Head', 'Headset': 'Head', 'Glasses': 'Head',
                 'PlateCarrier': 'Spine2', 'Belt': 'Hips'}.get(name)
        assignments = {}
        if fixed:
            assignments[fixed] = list(range(len(obj.data.vertices)))
        else:
            # Each disconnected pocket/strap/boot stays rigid. Use its nearest
            # body surface to identify the anatomical region, rather than its origin.
            adjacent = [set() for _ in obj.data.vertices]
            for edge in obj.data.edges:
                a, b = edge.vertices
                adjacent[a].add(b)
                adjacent[b].add(a)
            unseen = set(range(len(adjacent)))
            while unseen:
                todo = [unseen.pop()]
                component = []
                while todo:
                    i = todo.pop()
                    component.append(i)
                    for j in adjacent[i] & unseen:
                        unseen.remove(j)
                        todo.append(j)
                center = sum((obj.data.vertices[i].co for i in component), V()) / len(component)
                suffix = 'L' if center.x > 0 else 'R'
                if name == 'Boots':
                    target = 'Foot.' + suffix
                elif name == 'KneePads':
                    target = 'Shin.' + suffix
                elif center.z > 1.47:
                    target = 'Neck'
                else:
                    weights = {}
                    for i in component:
                        _, idx, _ = tree.find(obj.data.vertices[i].co)
                        for g in body.data.vertices[idx].groups:
                            key = body.vertex_groups[g.group].name
                            weights[key] = weights.get(key, 0) + g.weight
                    target = max(weights, key=weights.get)
                assignments.setdefault(target, []).extend(component)
        attach(obj, assignments)
    add_smoking_fingers(rig, body)
    return rig


def add_smoking_fingers(rig, body):
    """Add fingers after heat weighting, so the original clips retain their skin."""
    hand_matrix = rig.data.bones['Hand.R'].matrix_local.copy()
    # Measured in Hand.R space: +Y runs down the fingers, +X is the palm normal.
    fingers = {
        'Index': ((-.024,.092,-.047), (-.026,.126,-.055), (-.026,.157,-.057)),
        'Middle': ((-.021,.096,-.024), (-.022,.139,-.026), (-.021,.174,-.027)),
        'Ring': ((-.012,.093,.001), (-.005,.134,.001), (-.001,.167,.001)),
        'Little': ((.005,.084,.027), (.013,.116,.037), (.018,.145,.044)),
        'GripThumb': ((-.032,.040,-.048), (-.037,.064,-.075), (-.035,.079,-.095)),
    }
    select([rig], rig)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, points in fingers.items():
        for i in range(2):
            bone = rig.data.edit_bones.new(name + ('Tip.R' if i else '.R'))
            bone.head = hand_matrix @ V(points[i])
            bone.tail = hand_matrix @ V(points[i+1])
            bone.parent = rig.data.edit_bones['Hand.R' if i == 0 else name+'.R']
    bpy.ops.object.mode_set(mode='OBJECT')
    inverse = hand_matrix.inverted()
    for name in fingers:
        for suffix in ('.R', 'Tip.R'):
            body.vertex_groups.new(name=name+suffix)
    hand = body.vertex_groups['Hand.R']
    # Topology beyond the palm divides into four fingers; nearest centreline
    # assigns those vertices, with a smooth falloff across the knuckle rings.
    for vertex in body.data.vertices:
        local = inverse @ vertex.co
        if vertex.co.x > -.33 or local.y < .040:
            continue
        def distance(item):
            name, points = item
            a,b,c = map(V,points)
            distances = []
            for start,end in ((a,b),(b,c)):
                segment=end-start
                t=max(0,min(1,(local-start).dot(segment)/segment.length_squared))
                distances.append((local-start-segment*t).length)
            return min(distances)
        name, points = min(fingers.items(), key=distance)
        start, middle, end = map(V, points)
        if name != 'GripThumb' and local.y < .078:
            continue
        if name == 'GripThumb':
            # Fade across the thumb web, never pull the central palm with it.
            amount = max(0,min(1,(-local.z-.047)/.025))
            distal = max(0,min(1,(-local.z-.073)/.017))
        else:
            amount = max(0,min(1,(local.y-start.y+.012)/.025))
            distal = max(0,min(1,(local.y-middle.y+.010)/.020))
        inherited = 0
        for group in list(vertex.groups):
            group_name = body.vertex_groups[group.group].name
            if group_name in ('Hand.R','Fingers.R','Thumb.R'):
                inherited += group.weight
                body.vertex_groups[group.group].remove([vertex.index])
        if inherited:
            hand.add([vertex.index], inherited*(1-amount), 'REPLACE')
            body.vertex_groups[name+'.R'].add([vertex.index], inherited*amount*(1-distal), 'REPLACE')
            body.vertex_groups[name+'Tip.R'].add([vertex.index], inherited*amount*distal, 'REPLACE')


def orient(rig, name, desired):
    pb = rig.pose.bones[name]
    rest = pb.bone.matrix_local.to_quaternion()
    delta = pb.parent.matrix.to_quaternion() @ pb.parent.bone.matrix_local.to_quaternion().inverted()
    pb.rotation_quaternion = rest.inverted() @ delta.inverted() @ desired
    bpy.context.view_layer.update()


def hand_frame(direction, palm):
    y = direction.normalized()
    x = (palm - y*palm.dot(y)).normalized()
    return Matrix((x,y,x.cross(y))).transposed().to_quaternion()


def smoking_grip(rig):
    # Curl toward the palm (+hand X), and bring index/middle together.
    for name, curl, tip_curl, spread in [
        ('Index',20,18,9), ('Middle',23,20,-5),
        ('Ring',65,65,-6), ('Little',75,70,-12),
        ('GripThumb',55,45,65)]:
        for suffix, angle in [('.R',curl),('Tip.R',tip_curl)]:
            pb = rig.pose.bones[name+suffix]
            rest_in_hand = rig.data.bones['Hand.R'].matrix_local.inverted().to_quaternion() @ pb.bone.matrix_local.to_quaternion()
            delta = Quaternion((0,0,1), math.radians(-angle))
            if suffix == '.R':
                delta = Quaternion((1,0,0), math.radians(spread)) @ delta
            pb.rotation_quaternion = rest_in_hand.inverted() @ delta @ rest_in_hand
    bpy.context.view_layer.update()


def grip_socket(rig):
    smoking_grip(rig)
    points=[]
    for name in ('IndexTip.R','MiddleTip.R'):
        pb=rig.pose.bones[name]
        points.append(pb.head.lerp(pb.tail,.55))
    inverse = rig.pose.bones['Hand.R'].matrix.inverted()
    approximate = inverse @ ((points[0]+points[1])*.5)
    body = bpy.data.objects['Body']
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    rest_inverse = rig.data.bones['Hand.R'].matrix_local.inverted()
    surfaces = []
    for name in ('Index','Middle'):
        groups = {g.index for g in body.vertex_groups if g.name in (name+'.R',name+'Tip.R')}
        surfaces.append([inverse @ mesh.vertices[v.index].co for v in body.data.vertices
            if (rest_inverse @ v.co).y > .12 and sum(g.weight for g in v.groups if g.group in groups) > .4])
    # Match the 7 mm cigarette diameter to the actual posed finger surfaces.
    a,b = min(((a,b) for a in surfaces[0] for b in surfaces[1]),
              key=lambda pair: (((pair[0]+pair[1])*.5-approximate).length
                  +4*abs((pair[0]-pair[1]).length-.007)
                  +abs(pair[0].x-pair[1].x)))
    result = (a+b)*.5
    print('GRIP_SURFACE_GAP_M', (a-b).length)
    evaluated.to_mesh_clear()
    return result


def aim(rig, name, direction):
    """Set a bone's armature-space direction, compensating its posed parent."""
    pb = rig.pose.bones[name]
    rest = pb.bone.matrix_local.to_quaternion()
    desired = (rest @ V((0, 1, 0))).rotation_difference(direction.normalized()) @ rest
    parent_delta = (pb.parent.matrix.to_quaternion() @ pb.parent.bone.matrix_local.to_quaternion().inverted()) if pb.parent else Quaternion()
    pb.rotation_quaternion = rest.inverted() @ parent_delta.inverted() @ desired
    bpy.context.view_layer.update()


def arm_ik(rig, suffix, wrist, pole, hand_direction):
    upper = rig.pose.bones['UpperArm.' + suffix]
    shoulder = upper.head.copy()
    a = upper.bone.length
    b = rig.pose.bones['Forearm.' + suffix].bone.length
    delta = wrist - shoulder
    distance = min(max(delta.length, abs(a - b) + .005), a + b - .003)
    axis = delta.normalized()
    bend = pole - shoulder
    bend = (bend - axis * bend.dot(axis)).normalized()
    along = (a*a - b*b + distance*distance) / (2*distance)
    elbow = shoulder + axis * along + bend * math.sqrt(max(0, a*a - along*along))
    wrist = shoulder + axis * distance
    aim(rig, 'UpperArm.' + suffix, elbow - shoulder)
    aim(rig, 'Forearm.' + suffix, wrist - elbow)
    aim(rig, 'Hand.' + suffix, hand_direction)


def pose(rig, clip, t):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)
    phase = t * math.tau
    smoke = clip == 'Idle_Smoke'
    breath = math.sin(phase * (2 if smoke else 1))
    def rotate(name, xyz):
        from mathutils import Euler
        rig.pose.bones[name].rotation_quaternion = Euler(tuple(math.radians(x) for x in xyz), 'XYZ').to_quaternion()
    rotate('Spine', (.35 * breath, 0, .35 * math.sin(phase)))
    rotate('Spine1', (.45 * breath, 0, 0))
    rotate('Spine2', (.30 * breath, 0, .30 * math.sin(phase)))
    rotate('Head', (1.2 * breath, (3 if smoke else 9) * math.sin(phase), .8 * breath))
    bpy.context.view_layer.update()
    if clip != 'Death_Fall':
        # Small upper-body transfer leaves soles planted; no idle root drift.
        rig.pose.bones['Hips'].location.x = .002 * math.sin(phase)
        bpy.context.view_layer.update()
        for suffix, sign in [('L', 1), ('R', -1)]:
            wrist = V((sign * .285, -.105, 1.00))
            direction = V((sign * .15, -.13, -.97))
            if smoke and suffix == 'L':
                wrist = V((.195, -.18, 1.055))
                direction = V((-.45, -.1, -.65))
            if smoke and suffix == 'R':
                # Slerp full hand frames: direction-only interpolation previously
                # crossed an almost opposite axis and flipped the wrist roll.
                seconds = t * 6
                def smooth(x):
                    x = min(1, max(0, x))
                    return x*x*(3-2*x)
                lift = smooth((seconds - .8)/1.4) * (1-smooth((seconds - 3.8)/1.4))
                down = hand_frame(V((-.15,-.13,-.97)), V((1,.15,-.1)))
                raised = hand_frame(V((.62,0,.785)), V((0,1,0)))
                desired = down.slerp(raised,lift)
                # Filter endpoint is a fixed offset from the finger socket.
                head = rig.pose.bones['Head']
                lip = (head.matrix @ head.bone.matrix_local.inverted()) @ LIP_REFERENCE
                held_wrist = lip - desired @ (GRIP_LOCAL + V((.035,0,0)))
                wrist = wrist.lerp(held_wrist,lift)
                direction = desired @ V((0,1,0))
            arm_ik(rig, suffix, wrist, V((sign * .65, -.15, 1.18)), direction)
            if smoke and suffix == 'R':
                forearm = rig.pose.bones['Forearm.R']
                forearm_frame = hand_frame((forearm.tail-forearm.head), desired @ V((1,0,0)))
                shared = forearm.matrix.to_quaternion().slerp(forearm_frame,.85)
                orient(rig,'Forearm.R',shared)
                orient(rig,'Hand.R',desired)
                smoking_grip(rig)
    else:
        # Recoil, hips give way, shoulder hits ground, then settle supine.
        keys = [(0, 0, 0, 0), (.16, -15, 4, -.01), (.40, -43, 10, -.24),
                (.72, -94, 14, -.67), (.86, -86, 12, -.72), (1, -90, 12, -.715)]
        for left, right in zip(keys, keys[1:]):
            if left[0] <= t <= right[0]:
                u = (t-left[0])/(right[0]-left[0]); u = u*u*(3-2*u)
                tilt, roll, drop = [left[i]*(1-u)+right[i]*u for i in range(1,4)]
                break
        rotate('Hips', (tilt, 0, roll))
        rig.pose.bones['Hips'].location = (.14*t, drop, -.34*t)
        rotate('Spine', (8*math.sin(math.pi*t), 0, 0))
        rotate('Head', (9*math.sin(math.pi*t), 5*t, 0))
        rotate('Thigh.L', (-19*math.sin(math.pi*t), 0, -4*t))
        rotate('Thigh.R', (-29*math.sin(math.pi*t), 0, 7*t))
        rotate('Shin.L', (23*math.sin(math.pi*t), 0, 0))
        rotate('Shin.R', (37*math.sin(math.pi*t), 0, 0))
        bpy.context.view_layer.update()
        # Arms move with the torso; a loose outward splay on impact.
        for suffix, sign in [('L', 1), ('R', -1)]:
            rotate('UpperArm.' + suffix, (12*math.sin(math.pi*t), 0, sign*(8+18*t)))
            rotate('Forearm.' + suffix, (10*math.sin(math.pi*t), 0, sign*10))
    bpy.context.view_layer.update()
    if clip == 'Death_Fall':
        dg = bpy.context.evaluated_depsgraph_get()
        lowest = float('inf')
        for obj in rig.children:
            if obj.type != 'MESH' or obj.name == 'Cigarette':
                continue
            evaluated = obj.evaluated_get(dg)
            mesh = evaluated.to_mesh()
            lowest = min(lowest, min((evaluated.matrix_world @ v.co).z for v in mesh.vertices))
            evaluated.to_mesh_clear()
        if lowest < .004 or t >= .72:
            rig.pose.bones['Hips'].location.y += .004 - lowest
        bpy.context.view_layer.update()


def animate(rig):
    for clip, end in CLIPS.items():
        rig.animation_data_create()
        action = bpy.data.actions.new(clip)
        rig.animation_data.action = action
        max_twist = max_bend = 0
        for frame in range(1, end+1):
            pose(rig, clip, (frame-1)/(end-1))
            if frame == end and clip != 'Death_Fall':
                pose(rig, clip, 0)
            if clip == 'Idle_Smoke':
                swing, twist = rig.pose.bones['Hand.R'].rotation_quaternion.to_swing_twist('Y')
                max_twist = max(max_twist, abs(math.degrees(twist)))
                max_bend = max(max_bend, math.degrees(swing.angle))
            for pb in rig.pose.bones:
                pb.keyframe_insert('rotation_quaternion', frame=frame, group=pb.name)
                if pb.name == 'Hips':
                    pb.keyframe_insert('location', frame=frame, group=pb.name)
        if clip == 'Idle_Smoke':
            assert max_twist < 25 and max_bend < 45, (max_twist,max_bend)
            rig['smoke_wrist_max_twist_degrees'] = max_twist
            rig['smoke_wrist_max_bend_degrees'] = max_bend
        action.use_fake_user = True
        track = rig.animation_data.nla_tracks.new()
        track.name = clip
        strip = track.strips.new(clip, 1, action)
        strip.name = clip
        track.mute = True
    rig.animation_data.action = None


def cigarette(rig):
    hand_matrix = rig.data.bones['Hand.R'].matrix_local
    parts = []
    for name, center, length, color, emission in [
        ('Paper', tuple(GRIP_LOCAL + V((-.003,0,0))), .076, (.92,.90,.80,1), 0),
        ('Ember', tuple(GRIP_LOCAL + V((-.043,0,0))), .004, (1,.13,.008,1), 3)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=.0035, depth=length, location=center, rotation=(0,math.pi/2,0))
        obj = bpy.context.object
        mat = bpy.data.materials.new('Cigarette_' + name)
        mat.diffuse_color = color
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value = color
        shader.inputs['Roughness'].default_value = .8
        shader.inputs['Emission Color'].default_value = color
        shader.inputs['Emission Strength'].default_value = emission
        obj.data.materials.append(mat)
        select([obj], obj)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for v in obj.data.vertices:
            v.co = hand_matrix @ v.co
        parts.append(obj)
    select(parts, parts[0]); bpy.ops.object.join()
    obj = bpy.context.object; obj.name = 'Cigarette'
    obj.parent = rig
    obj.vertex_groups.new(name='Hand.R').add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    mod = obj.modifiers.new('Right hand attachment', 'ARMATURE'); mod.object = rig
    obj['asset_node_id'] = 'ua_infantry_01/Cigarette'
    obj['visibility_note'] = 'Show only for Idle_Smoke in game; no glTF visibility animation.'
    return obj


def read_glb(path):
    raw = path.read_bytes()
    size, = struct.unpack_from('<I', raw, 12)
    return json.loads(raw[20:20+size]), len(raw)


def validate(rig, meshes, prop, original_hashes):
    scene = bpy.context.scene
    for pb in rig.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    select([bpy.data.objects['SoldierRoot'], rig, *meshes.values(), prop], rig)
    rig.animation_data.action = None
    for track in rig.animation_data.nla_tracks:
        track.mute = False
    bpy.ops.export_scene.gltf(filepath=str(OUT), export_format='GLB', use_selection=True,
        export_yup=True, export_extras=True, export_animations=True,
        export_animation_mode='NLA_TRACKS', export_frame_range=False,
        export_force_sampling=True, export_optimize_animation_size=True,
        export_vertex_color='ACTIVE', export_all_vertex_colors=False)
    for track in rig.animation_data.nla_tracks:
        track.mute = True
    gltf, size = read_glb(OUT)
    names = [a['name'] for a in gltf['animations']]
    assert sorted(names) == sorted(CLIPS), names
    assert size < 3_000_000, size
    assert any(n.get('name') == 'Cigarette' for n in gltf['nodes'])
    assert len(gltf['skins'][0]['joints']) >= 23
    assert len(gltf['materials']) == 10
    imported_scene = bpy.data.scenes.new('Rig_Validation')
    imported_scene.render.fps = 30
    bpy.context.window.scene = imported_scene
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT))
    imported = set(bpy.data.objects) - before
    rigs = [o for o in imported if o.type == 'ARMATURE']
    assert rigs and len(rigs[0].data.bones) >= 23
    assert any(o.name.split('.')[0] == 'Cigarette' for o in imported)
    imported_rig = rigs[0]
    assert len(imported_rig.animation_data.nla_tracks) == 3
    imported_rig.animation_data.action = None
    for track in imported_rig.animation_data.nla_tracks:
        track.mute = True
    playback = {}
    for track in imported_rig.animation_data.nla_tracks:
        track.mute = False
        end = CLIPS[track.name]
        snapshots = []
        for frame in (1, (end+2)//3, end):
            imported_scene.frame_set(frame)
            bpy.context.view_layer.update()
            snapshots.append({pb.name: pb.matrix.copy() for pb in imported_rig.pose.bones})
        if track.name != 'Death_Fall':
            error = max(abs(snapshots[0][name][row][col] - snapshots[-1][name][row][col])
                        for name in snapshots[0] for row in range(4) for col in range(4))
            assert error < .00001, (track.name, error)
            moving = max((snapshots[0][name].translation - snapshots[1][name].translation).length for name in snapshots[0])
            assert moving > .0001, (track.name, 'frozen clip')
            playback[track.name] = {'loop_matrix_error': error, 'sample_motion_m': moving}
        else:
            dg = bpy.context.evaluated_depsgraph_get()
            points = []
            for obj in imported:
                if obj.type == 'MESH' and obj.parent is not None and not obj.name.startswith('Cigarette'):
                    evaluated = obj.evaluated_get(dg); mesh = evaluated.to_mesh()
                    points.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
                    evaluated.to_mesh_clear()
            low, high = min(v.z for v in points), max(v.z for v in points)
            assert -.001 < low < .015 and high < .55, (low, high)
            playback[track.name] = {'last_frame_z_bounds_m': [low, high]}
        if track.name == 'Idle_Smoke':
            cigarette_obj = next(o for o in imported if o.name.startswith('Cigarette'))
            body_obj = next(o for o in imported if o.name.startswith('Body'))
            hand_reference = rig.data.bones['Hand.R'].matrix_local
            rest_points = [cigarette_obj.matrix_world @ v.co for v in cigarette_obj.data.vertices]
            projected = [hand_reference.inverted() @ v for v in rest_points]
            filter_x = max(v.x for v in projected)
            filter_ids = [i for i,v in enumerate(projected) if filter_x-v.x < .00001]
            assert filter_ids
            max_slip = max_lip_gap = 0
            local_reference = None
            contacts = []
            for frame in range(1,end+1):
                imported_scene.frame_set(frame)
                dg = bpy.context.evaluated_depsgraph_get()
                hand = imported_rig.pose.bones['Hand.R']
                hand_world = imported_rig.matrix_world @ hand.matrix
                evaluated = cigarette_obj.evaluated_get(dg); mesh = evaluated.to_mesh()
                points = [evaluated.matrix_world @ v.co for v in mesh.vertices]
                filter_center = sum((points[i] for i in filter_ids), V()) / len(filter_ids)
                local_filter = hand_world.inverted() @ filter_center
                if local_reference is None:
                    local_reference = local_filter.copy()
                max_slip = max(max_slip,(local_filter-local_reference).length)
                evaluated.to_mesh_clear()
                head = imported_rig.pose.bones['Head']
                lip = imported_rig.matrix_world @ (head.matrix @ head.bone.matrix_local.inverted()) @ LIP_REFERENCE
                if 67 <= frame <= 115:
                    max_lip_gap = max(max_lip_gap,(filter_center-lip).length)
                if frame in (1,76,91,151,181):
                    delta = hand.matrix @ hand.bone.matrix_local.inverted()
                    axis = (delta.to_3x3() @ (hand_reference.to_3x3() @ V((1,0,0)))).normalized()
                    grip_center = filter_center-axis*.035
                    evaluated = body_obj.evaluated_get(dg); mesh = evaluated.to_mesh()
                    pair=[]
                    for name in ('Index','Middle'):
                        groups={g.index for g in body_obj.vertex_groups if g.name in (name+'.R',name+'Tip.R')}
                        indices=[v.index for v in body_obj.data.vertices if sum(g.weight for g in v.groups if g.group in groups)>.4]
                        pair.append(min(((evaluated.matrix_world @ mesh.vertices[i].co)-grip_center).length for i in indices))
                    contacts.append({'frame':frame,'finger_surface_distance_m':pair,'filter_lip_distance_m':(filter_center-lip).length})
                    evaluated.to_mesh_clear()
            assert max_slip < .00001, max_slip
            assert max_lip_gap < .003, max_lip_gap
            assert all(max(c['finger_surface_distance_m']) < .006 for c in contacts), contacts
            assert contacts[0]['filter_lip_distance_m'] > .35
            playback[track.name].update({'cigarette_hand_slip_m':max_slip,
                'hold_filter_lip_max_gap_m':max_lip_gap,'grip_samples':contacts,
                'wrist_max_twist_degrees':rig['smoke_wrist_max_twist_degrees'],
                'wrist_max_bend_degrees':rig['smoke_wrist_max_bend_degrees']})
        track.mute = True
    report = {'blender': bpy.app.version_string, 'glb_bytes': size,
              'clips': names, 'fps': 30, 'durations_seconds': {k:(v-1)/30 for k,v in CLIPS.items()},
              'reimport_bones': list(rigs[0].data.bones.keys()), 'reimport_cigarette': True, 'reimport_playback': playback,
              'source_files_unchanged': all(hashlib.sha256(p.read_bytes()).hexdigest() == h for p,h in original_hashes.items())}
    assert report['source_files_unchanged']
    print('UA_RIG_VALIDATION', json.dumps(report, ensure_ascii=False))
    (ASSET/'rig_validation.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
    bpy.context.window.scene = scene
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.scenes.remove(imported_scene)


def previews(rig, prop):
    scene = bpy.context.scene
    # Workbench is display-independent with CPU rendering in headless Blender.
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = 'BOTH'
    scene.display.shading.background_type = 'WORLD'
    scene.world.color = (.15,.15,.15)
    scene.render.resolution_x = 800; scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    scene.camera = camera
    camera.data.type = 'ORTHO'
    # Preview-only floor gives a visible contact reference; never exported.
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.004))
    floor = bpy.context.object; floor.name = 'Preview_Ground'
    material = bpy.data.materials.new('Preview_Ground')
    material.diffuse_color = (.22,.24,.26,1)
    floor.data.materials.append(material)
    for clip, frames in {'Idle_Alert':[1,31,91], 'Idle_Smoke':[1,76,151], 'Death_Fall':[1,23,43]}.items():
        rig.animation_data.action = bpy.data.actions[clip]
        for frame in frames:
            scene.frame_set(frame)
            prop.hide_render = clip != 'Idle_Smoke'
            target = V((0,0,.90)) if clip != 'Death_Fall' else V((.05,.3,.70))
            camera.location = target + V((-3,-5,2.1))
            camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
            camera.data.ortho_scale = 2.25 if clip != 'Death_Fall' else 2.65
            scene.render.filepath = str(PREVIEWS / f'rig_{clip}_{frame:03d}.png')
            bpy.ops.render.render(write_still=True)
    rig.animation_data.action = bpy.data.actions['Idle_Smoke']
    scene.frame_set(91)
    prop.hide_render = False
    target = V((-.075,-.15,1.56))
    camera.location = target + V((-2,-3,.7))
    camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale = .56
    scene.render.filepath = str(PREVIEWS/'rig_smoke_closeup.png')
    bpy.ops.render.render(write_still=True)


def main():
    assert bpy.app.version[:2] == (5,2), bpy.app.version_string
    sources = [ASSET/'ua_infantry_01.blend', ASSET/'ua_infantry_01.glb']
    original_hashes = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    bpy.ops.wm.open_mainfile(filepath=str(sources[0]))
    scene = bpy.context.scene
    scene.render.fps = 30
    scene.frame_start = 1; scene.frame_end = 181
    meshes = {o.name:o for o in scene.objects if o.type == 'MESH'}
    root = bpy.data.objects['SoldierRoot']; root['asset_version'] = 5
    rig = build_rig(meshes, root)
    global GRIP_LOCAL
    GRIP_LOCAL = grip_socket(rig)
    print('SMOKE_GRIP_LOCAL', list(GRIP_LOCAL))
    animate(rig)
    prop = cigarette(rig)
    validate(rig, meshes, prop, original_hashes)
    previews(rig, prop)


if __name__ == '__main__':
    main()
