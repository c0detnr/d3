"""Closed military maintenance hangar. Run through Blender MCP in a dedicated file.
STAGE: blockout, detail, export. Metres; front -Y; origin at main footprint centre.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion
BASE=Path('/home/mami/Projects/d3')
OUT=BASE/'assets/environment/maintenance_hangar_01'
OUT.mkdir(parents=True,exist_ok=True)
SCENE='IRON_DUST_MAINTENANCE_HANGAR_01'
assert bpy.context.scene.name==SCENE, 'Use the dedicated hangar scene'
assert not bpy.data.filepath or Path(bpy.data.filepath)==OUT/'maintenance_hangar_01.blend', 'Protect other files'
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1

def material(name,color,metal=0,rough=.8):
    key='MH01_'+name
    m=bpy.data.materials.get(key)
    if m:return m
    rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(key);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m
concrete=material('Concrete','77796B')
olive=material('Olive','60674C',.25)
lightolive=material('PanelHighlight','73795B',.25)
steel=material('GraphiteSteel','343D3B',.6,.6)
roofmat=material('Roof','48534B',.4)
black=material('Recess','1D2829',.1)
yellow=material('SafetyYellow','BB9646',.15)
white=material('Stencil','C7CAB1')
rust=material('Oxide','79533C',.25)
glass=material('SmokedGlass','45666B',.25,.32)

def collection(name):
    c=bpy.data.collections.get(name)
    if not c:c=bpy.data.collections.new(name);scene.collection.children.link(c)
    return c
asset=collection('MH01_Asset');colliders=collection('MH01_Collision')

def mesh(name,verts,faces,mat,coll=asset):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    o=bpy.data.objects.new(name,d);coll.objects.link(o)
    if mat:d.materials.append(mat)
    root=bpy.data.objects.get('MaintenanceHangarRoot')
    if root:o.parent=root
    return o

def box(name,loc,size,mat,bevel=0,coll=asset):
    x,y,z=[v/2 for v in size]
    v=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    f=[(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
    o=mesh(name,v,f,mat,coll);o.location=loc
    if bevel:
        mod=o.modifiers.new('Small edge chamfer','BEVEL');mod.width=bevel;mod.segments=1
        deps=bpy.context.evaluated_depsgraph_get();new=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps)
        o.modifiers.clear();old=o.data;o.data=new
        if old.users==0:bpy.data.meshes.remove(old)
    return o

def profile(name,points,front,back,mat,coll=asset):
    n=len(points);verts=[(x,y,z) for y in (front,back) for x,z in points]
    faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]
    for i in range(n):j=(i+1)%n;faces.append((i,n+i,n+j,j))
    return mesh(name,verts,faces,mat,coll)

def text(name,body,loc,size,mat):
    d=bpy.data.curves.new(name,'FONT');d.body=body;d.size=size;d.extrude=0;d.align_x='CENTER'
    o=bpy.data.objects.new(name,d);asset.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0)
    d.materials.append(mat);o.parent=bpy.data.objects['MaintenanceHangarRoot']
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object

def beam(name,a,b,width,mat):
    delta=Vector(b)-Vector(a);o=box(name,(Vector(a)+Vector(b))/2,(width,width,delta.length),mat)
    o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o

roof_profile=[(-16,0),(16,0),(16,9.2),(3.5,10.5),(3.5,11.6),(-3.5,11.6),(-3.5,10.5),(-16,9.2)]
if STAGE=='blockout':
    assert not bpy.data.objects.get('MaintenanceHangarRoot'), 'Blockout already exists'
    # Only the factory objects in this dedicated, newly created process are removed.
    for o in list(scene.objects):bpy.data.objects.remove(o,do_unlink=True)
    root=bpy.data.objects.new('MaintenanceHangarRoot',None);asset.objects.link(root)
    root['asset_id']='maintenance_hangar_01';root['closed_building']=True;root['units']='metres'
    box('ConcretePlinth',(0,0,.18),(32.6,22.6,.36),concrete,.06)
    profile('ClosedMainVolume',roof_profile,-11,11,olive)
    box('ConcreteLower',(0,0,1.25),(32.12,22.12,2.5),concrete,.06)
    box('ServiceWing',(19.4,2,2.5),(6.8,16,5),olive,.05)
    box('ServiceConcrete',(19.4,2,1.1),(6.9,16.1,2.2),concrete,.04)
    box('ServiceRoof',(19.4,2,5.12),(7.2,16.5,.24),roofmat,.04)
    box('ClosedDoorRecess',(-5,-11.09,3.6),(10.7,.12,7.2),black)
    box('ClosedDoorLeft',(-7.57,-11.18,3.45),(5.08,.12,6.65),steel,.025)
    box('ClosedDoorRight',(-2.43,-11.18,3.45),(5.08,.12,6.65),steel,.025)
    bpy.context.view_layer.update()
    scene['production_stage']='blockout'
elif STAGE=='detail':
    assert scene.get('production_stage')=='blockout', 'Detail only once after blockout'
    main=bpy.data.objects['ClosedMainVolume']
    main.data.materials.append(roofmat)
    for face in main.data.polygons:
        if face.normal.z>.3:face.material_index=1
    # Eave trim and raised monitor roof create the recognisable stepped silhouette.
    for side in (-1,1):
        for x in (3.5,16):
            box('EaveFlashing',(side*x,0,10.5 if x==3.5 else 9.2),(.22,22.6,.22),roofmat)
        for i in range(9):
            y=-10.7+i*2.65
            box('SideStructuralRib',(side*16.09,y,5.8),(.18,.20,6.6),lightolive,.025)
        box('SideSill',(side*16.08,0,2.62),(.20,22,.18),steel)
        # Narrow high windows, well above tank-height sight lines.
        for y in (-7,-2,3,8):
            box('HighWindowFrame',(side*16.13,y,7.5),(.14,3.2,.95),steel)
            box('HighWindow',(side*16.22,y,7.5),(.025,2.9,.64),glass)
    for y in (-11.10,11.10):
        for i in range(13):
            x=-15.6+i*2.6
            if y<0 and -10.5<x<.5:continue
            box('FacadeRib',(x,y,5.7),(.16,.16,6.3),lightolive,.02)
        box('FrontSill',(0,y,2.62),(32,.15,.18),steel)
        box('CrownFascia',(0,y,11.52),(7.2,.20,.25),roofmat)
    # Actual roof slopes; metal seam strips follow their incline.
    for side in (-1,1):
        a=Vector((side*3.5,0,10.55));b=Vector((side*16.3,0,9.22));slope=b-a
        for i in range(12):
            y=-10.9+i*1.98
            o=box('RoofStandingSeam',((a.x+b.x)/2,y,(a.z+b.z)/2),(slope.length,.065,.065),roofmat)
            o.rotation_euler.y=-math.atan2(slope.z,abs(slope.x))*side
    box('MonitorCap',(0,0,11.65),(7.4,22.5,.18),roofmat,.03)
    for side in (-1,1):
        for y in (-7,0,7):
            box('MonitorVentBacking',(side*3.56,y,11.02),(.12,4.7,.70),black)
            for z in (10.82,11.02,11.22):box('MonitorVentSlat',(side*3.64,y,z),(.11,4.6,.08),steel)
    # Recessed closed sliding panels, frame, top rail and restrained bracing.
    for x in (-10.6,.6):box('DoorJamb',(x,-11.32,3.55),(.35,.45,7.1),concrete,.04)
    box('DoorHeader',(-5,-11.35,7.14),(11.6,.5,.40),concrete,.04)
    box('DoorRail',(-5,-11.65,7.5),(12.2,.35,.28),steel,.03)
    for z in (1.2,3.1,5,6.5):box('DoorHorizontal',(-5,-11.28,z),(10.2,.12,.10),lightolive)
    for x in (-9.9,-7.45,-5,-2.55,-.1):box('DoorVertical',(x,-11.30,3.45),(.10,.12,6.5),lightolive)
    for x in (-7.55,-2.45):
        beam('DoorBrace',(x-2.25,-11.34,.35),(x+2.25,-11.34,6.5),.12,lightolive)
        box('DoorHandle',(x+1.8,-11.43,1.6),(.10,.15,.5),black,.02)
    # Small striped guards beside the gate, with explicit black/yellow geometry.
    for x in (-11.25,1.25):
        box('GateGuard',(x,-11.48,.85),(.55,.55,1.7),yellow,.06)
        for z in (.4,.9,1.4):box('GuardBlackBand',(x,-11.77,z),(.54,.015,.19),black)
    # Personnel access on the service wing, closed and offset from main door.
    box('ServiceDoorFrame',(19.8,-6.09,1.55),(1.65,.16,3.1),black)
    box('ServiceDoor',(19.8,-6.20,1.50),(1.4,.10,2.9),steel,.025)
    box('ServiceHandle',(20.25,-6.29,1.3),(.10,.1,.22),yellow)
    for x in (17,22.5):box('ServiceFrontRib',(x,-6.11,3.35),(.14,.15,3.2),lightolive)
    for y in (-3,2,7):
        box('ServiceVentBacking',(22.9,y,3.6),(.10,2.1,1.25),black)
        for z in (3.2,3.45,3.7,3.95):box('ServiceVentSlat',(22.97,y,z),(.10,1.95,.10),steel)
    for x in (18.1,20.8):
        box('RoofExtractorBase',(x,5,5.35),(1.5,1.6,.3),steel,.04)
        box('RoofExtractor',(x,5,5.9),(1.1,1.2,.9),roofmat,.06)
        box('ExtractorCap',(x,5,6.45),(1.7,1.7,.2),steel,.04)
    for x in (-13.9,2.3,13.7):
        box('LampArm',(x,-11.45,8.4),(.16,.9,.12),steel)
        box('LampHousing',(x,-11.9,8.35),(.85,.42,.22),steel,.04)
        box('LampLens',(x,-12.12,8.30),(.65,.02,.10),white)
    box('FacilitySign',(8.1,-11.24,5.6),(8.8,.18,2.6),steel,.04)
    text('FacilityNumber','B-01',(8.1,-11.35,5.45),1.7,white)
    text('FacilityLabel','BAKIM',(8.1,-11.35,4.65),.44,white)
    text('DoorNumber','01',(-5,-11.39,4.1),.9,white)
    # A few oxidation strips, not independent scratches scattered everywhere.
    for x in (-15.7,13.0):box('OxideRun',(x,-11.21,2.8),(.13,.025,.55),rust)
    # Asset meshes grouped by material keep export draw calls bounded.
    for mat in [concrete,olive,lightolive,steel,roofmat,black,yellow,white,rust,glass]:
        objs=[o for o in asset.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==mat]
        if len(objs)>1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in objs:o.select_set(True)
            bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();bpy.context.object.name=mat.name+'_Geometry'
    scene['production_stage']='detail'
elif STAGE=='export':
    assert scene.get('production_stage')=='detail'
    assert not colliders.objects, 'Export colliders already created'
    profile('COL_Main',roof_profile,-11,11,None,colliders)
    box('COL_Service',(19.4,2,2.62),(6.9,16.1,5.24),None,coll=colliders)
    box('COL_Plinth',(0,0,.18),(32.6,22.6,.36),None,coll=colliders)
    for o in colliders.objects:
        o['collision_only']=True;o.display_type='WIRE';o.hide_render=True
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(asset.objects)+list(colliders.objects):o.select_set(True)
    bpy.context.view_layer.objects.active=bpy.data.objects['MaintenanceHangarRoot']
    bpy.ops.export_scene.gltf(filepath=str(OUT/'maintenance_hangar_01.glb'),export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False)
    for o in colliders.objects:o.hide_set(True)
    scene['production_stage']='export'
else:raise ValueError(STAGE)
# Frame the model in the visible dedicated Blender window.
bpy.context.view_layer.update()
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.region_3d.view_distance=56
        area.spaces.active.region_3d.view_location=Vector((2,0,4))
        area.spaces.active.region_3d.view_rotation=Quaternion((.877,.303,.128,.351))
visible=[o for o in asset.objects if o.type=='MESH']
for o in visible:o.data.calc_loop_triangles()
points=[o.matrix_world@Vector(v) for o in visible for v in o.bound_box]
stats={'stage':STAGE,'visible_meshes':len(visible),'visible_triangles':sum(len(o.data.loop_triangles) for o in visible),'collision_meshes':len(colliders.objects),'collision_triangles':sum(len(p.vertices)-2 for o in colliders.objects for p in o.data.polygons),'bounds_min':[min(v[i] for v in points) for i in range(3)],'bounds_max':[max(v[i] for v in points) for i in range(3)],'background':bpy.app.background,'windows':len(bpy.context.window_manager.windows)}
(OUT/'model_stats.json').write_text(json.dumps(stats,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'maintenance_hangar_01.blend'))
result=stats
