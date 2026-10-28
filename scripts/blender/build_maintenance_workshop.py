"""Closed military maintenance workshop. Run through Blender MCP in a dedicated file.
STAGE: blockout, detail, export. Metres; front -Y; origin at main footprint centre.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion
BASE=Path('/home/mami/Projects/d3')
OUT=BASE/'assets/environment/maintenance_workshop_01'
OUT.mkdir(parents=True,exist_ok=True)
SCENE='IRON_DUST_MAINTENANCE_WORKSHOP_01'
assert bpy.context.scene.name==SCENE, 'Use the dedicated workshop scene'
assert not bpy.data.filepath or Path(bpy.data.filepath)==OUT/'maintenance_workshop_01.blend', 'Protect other files'
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1

def material(name,color,metal=0,rough=.8):
    key='MW01_'+name
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
asset=collection('MW01_Asset');colliders=collection('MW01_Collision')

def mesh(name,verts,faces,mat,coll=asset):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    o=bpy.data.objects.new(name,d);coll.objects.link(o)
    if mat:d.materials.append(mat)
    root=bpy.data.objects.get('MaintenanceWorkshopRoot')
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
    d.materials.append(mat);o.parent=bpy.data.objects['MaintenanceWorkshopRoot']
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object

def beam(name,a,b,width,mat):
    delta=Vector(b)-Vector(a);o=box(name,(Vector(a)+Vector(b))/2,(width,width,delta.length),mat)
    o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o

if STAGE=='blockout':
    assert not bpy.data.objects.get('MaintenanceWorkshopRoot'), 'Blockout already exists'
    for o in list(scene.objects):bpy.data.objects.remove(o,do_unlink=True)
    root=bpy.data.objects.new('MaintenanceWorkshopRoot',None);asset.objects.link(root)
    root['asset_id']='maintenance_workshop_01';root['closed_building']=True;root['units']='metres'
    box('Foundation',(0,0,.14),(18.4,12.4,.28),concrete,.045)
    box('ClosedConcreteBody',(0,0,2.55),(18,12,5.1),concrete,.06)
    box('FlatRoof',(0,0,5.18),(18.6,12.6,.24),roofmat,.045)
    box('DoorRecess',(-3.8,-6.08,2.22),(7.8,.14,4.44),black)
    box('ClosedRollerDoor',(-3.8,-6.18,2.15),(7.25,.13,4.16),olive,.025)
    box('SideCanopy',(11.25,.3,3.6),(4.9,8.5,.18),roofmat,.035)
    for y in (-3.65,4.25):box('CanopyPost',(13.45,y,1.76),(.22,.22,3.52),steel,.025)
    scene['production_stage']='blockout'
elif STAGE=='detail':
    assert scene.get('production_stage')=='blockout'
    # Structural joints and broad frames carry the facade at tank viewing height.
    for side in (-1,1):
        for y in (-5.85,-1.95,1.95,5.85):
            box('SidePier',(side*9.04,y,2.65),(.24,.3,5.05),concrete,.035)
        box('SideLowerBand',(side*9.08,0,.65),(.18,12,.45),steel)
        for y in (-3.9,0,3.9):
            box('HighWindowFrame',(side*9.15,y,4.25),(.14,2.9,.8),steel)
            box('HighWindowGlass',(side*9.23,y,4.25),(.025,2.65,.57),glass)
            for dy in (-.85,0,.85):box('WindowMullion',(side*9.25,y+dy,4.25),(.04,.045,.58),steel)
        # A parapet hides the roof edge and breaks the otherwise flat concrete box.
        box('SideParapet',(side*9.12,0,5.45),(.24,12.5,.44),concrete,.025)
        box('SideParapetCap',(side*9.12,0,5.70),(.34,12.65,.10),steel,.02)
    for y in (-6.13,6.13):
        box('RoofFascia',(0,y,5.45),(18.3,.24,.44),concrete,.025)
        box('RoofEdgeCap',(0,y,5.70),(18.6,.34,.10),steel,.02)
    for x in (-8.7,.4,8.7):box('FrontPier',(x,-6.12,2.65),(.32,.24,5.05),concrete,.035)
    for x in (-7.65,.05):box('ServiceDoorJamb',(x,-6.29,2.23),(.32,.40,4.46),concrete,.025)
    box('DoorLintel',(-3.8,-6.3,4.5),(8.05,.45,.38),concrete,.035)
    box('RollerHousing',(-3.8,-6.48,4.9),(8.1,.65,.40),steel,.05)
    for i in range(15):box('DoorSlat',(-3.8,-6.26,.27+i*.26),(7.22,.06,.045),lightolive)
    box('DoorBottomBar',(-3.8,-6.30,.13),(7.25,.12,.15),steel)
    for x in (-6.9,-.7):
        box('DoorBumper',(x,-6.63,.75),(.34,.36,1.5),yellow,.04)
        for z in (.3,.75,1.2):box('BumperBand',(x,-6.82,z),(.33,.025,.16),black)
    box('PersonnelFrame',(6,-6.17,1.45),(1.65,.16,2.9),black)
    box('PersonnelDoor',(6,-6.28,1.40),(1.4,.10,2.75),olive,.02)
    box('DoorHandle',(6.47,-6.37,1.25),(.08,.10,.18),yellow)
    box('DoorHood',(6,-6.53,3.02),(2,.95,.12),steel,.025)
    box('SignPanel',(3.6,-6.22,4.18),(4.4,.15,.9),steel,.02)
    text('WorkshopSign','ATOLYE',(3.6,-6.31,3.96),.56,white)
    text('BayNumber','02',(-3.8,-6.32,2.75),.76,white)
    # Short open canopy, no perimeter slab or rail that traps tank movement.
    for y in (-3.65,.3,4.25):
        box('CanopyCrossBeam',(11.3,y,3.43),(4.8,.18,.22),steel)
        beam('CanopyBrace',(13.45,y,2.75),(12.7,y,3.42),.12,steel)
    for x in (9.4,10.5,11.6,12.7):box('CanopySeam',(x,.3,3.71),(.055,8.45,.045),lightolive)
    for y in (-3.65,4.25):
        box('PostFoot',(13.45,y,.13),(.5,.5,.26),concrete,.025)
        box('PostSafetyMark',(13.45,y-.12,.8),(.23,.025,.65),yellow)
    # Roof extractors and a low service duct, all static silhouettes.
    for x in (-4.7,3.5):
        box('ExtractorCurb',(x,2.6,5.54),(2.25,2,.5),steel,.04)
        box('ExtractorBody',(x,2.6,6.08),(1.65,1.4,.65),olive,.04)
        box('ExtractorShadow',(x,2.6,6.47),(1.78,1.5,.15),black)
        box('ExtractorCap',(x,2.6,6.62),(2.3,2,.18),roofmat,.04)
        for z in (5.9,6.1,6.3):box('ExtractorLouver',(x,1.86,z),(1.5,.07,.075),lightolive)
    box('RoofDuct',(-.6,2.6,5.64),(6,.7,.7),steel,.04)
    for x in (-2.8,-.6,1.6):box('DuctJoint',(x,2.6,5.64),(.07,.77,.77),lightolive)
    # Back wall utilities stay tight to the building rather than filling the routes.
    box('RearVentBacking',(-4,6.12,2.8),(3,.14,1.6),black)
    for z in (2.2,2.5,2.8,3.1,3.4):box('RearVentLouver',(-4,6.23,z),(2.85,.16,.10),steel)
    box('UtilityCabinet',(5.8,6.28,1.7),(1.8,.5,2.4),olive,.04)
    box('CabinetSeam',(5.8,6.54,1.7),(.035,.025,2.2),black)
    for x in (-8.6,8.6):
        box('Downpipe',(x,6.3,2.7),(.14,.14,5.3),steel)
        for z in (1,3.5):box('PipeBracket',(x,6.26,z),(.3,.22,.09),lightolive)
    for x in (-7.7,.4,7.6):
        box('LampArm',(x,-6.48,5.1),(.12,.65,.12),steel)
        box('LampHousing',(x,-6.85,5.05),(.65,.32,.18),steel,.025)
        box('LampLens',(x,-7.02,5.02),(.5,.025,.08),white)
    for x in (-8.5,8.4):box('RestrainedOxide',(x,-6.15,1.1),(.10,.025,.45),rust)
    for mat in [concrete,olive,lightolive,steel,roofmat,black,yellow,white,rust,glass]:
        objs=[o for o in asset.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==mat]
        if len(objs)>1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in objs:o.select_set(True)
            bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();bpy.context.object.name=mat.name+'_Geometry'
    scene['production_stage']='detail'
elif STAGE=='export':
    assert scene.get('production_stage')=='detail' and not colliders.objects
    box('COL_Main',(0,0,2.55),(18,12,5.1),None,coll=colliders)
    box('COL_Foundation',(0,0,.14),(18.4,12.4,.28),None,coll=colliders)
    box('COL_CanopyRoof',(11.25,.3,3.6),(4.9,8.5,.18),None,coll=colliders)
    for y in (-3.65,4.25):box('COL_CanopyPost',(13.45,y,1.76),(.5,.5,3.52),None,coll=colliders)
    box('COL_RoofEquipment',(-.6,2.6,6.05),(10.5,2,1.32),None,coll=colliders)
    for o in colliders.objects:
        o['collision_only']=True;o.display_type='WIRE';o.hide_render=True
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(asset.objects)+list(colliders.objects):o.select_set(True)
    bpy.context.view_layer.objects.active=bpy.data.objects['MaintenanceWorkshopRoot']
    bpy.ops.export_scene.gltf(filepath=str(OUT/'maintenance_workshop_01.glb'),export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False)
    for o in colliders.objects:o.hide_set(True)
    scene['production_stage']='export'
else:raise ValueError(STAGE)
bpy.context.view_layer.update()
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.shading.type='MATERIAL'
        area.spaces.active.region_3d.view_distance=34
        area.spaces.active.region_3d.view_location=Vector((2,0,2))
        area.spaces.active.region_3d.view_rotation=Quaternion((.877,.303,.128,.351))
visible=[o for o in asset.objects if o.type=='MESH']
for o in visible:o.data.calc_loop_triangles()
points=[o.matrix_world@Vector(v) for o in visible for v in o.bound_box]
stats={'stage':STAGE,'visible_meshes':len(visible),'visible_triangles':sum(len(o.data.loop_triangles) for o in visible),'collision_meshes':len(colliders.objects),'collision_triangles':sum(len(p.vertices)-2 for o in colliders.objects for p in o.data.polygons),'bounds_min':[min(v[i] for v in points) for i in range(3)],'bounds_max':[max(v[i] for v in points) for i in range(3)],'background':bpy.app.background,'windows':len(bpy.context.window_manager.windows)}
(OUT/'model_stats.json').write_text(json.dumps(stats,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'maintenance_workshop_01.blend'))
result=stats
