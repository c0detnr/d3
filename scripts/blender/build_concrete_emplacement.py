"""Blender MCP production in a dedicated file. STAGE: blockout, detail, export."""
import bpy, bmesh, math, json, random
from pathlib import Path
from mathutils import Vector, Quaternion
BASE=Path('/home/mami/Projects/d3')
OUT=BASE/'assets/environment/concrete_emplacement_01'
OUT.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
assert scene.name=='IRON_DUST_CONCRETE_EMPLACEMENT_01'
assert not bpy.data.filepath or Path(bpy.data.filepath)==OUT/'concrete_emplacement_01.blend'
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1

def collection(name):
    c=bpy.data.collections.get(name)
    if c is None:c=bpy.data.collections.new(name);scene.collection.children.link(c)
    return c
asset=collection('CE01_Asset');collision=collection('CE01_Collision')

def material(name,color,metal=0,rough=.88):
    key='CE01_'+name;m=bpy.data.materials.get(key)
    if m:return m
    rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(key);m.use_nodes=True;m.diffuse_color=(*rgb,1)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1)
    bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m
concrete=material('Concrete','77796B');edge=material('FreshFracture','9B9C89')
base_mat=material('DarkConcrete','64695C');rust=material('Oxide','79533C',.35)
steel=material('GraphiteSteel','343D3B',.55,.7);stain=material('WaterStain','5A6052')
stencil=material('FadedStencil','B9B9A0');gravel=material('Aggregate','8A8977')

def mesh(name,verts,faces,mat,coll=asset):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    # Profiles have arbitrary winding; keep all closed solids consistently outward.
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);coll.objects.link(obj)
    if mat:data.materials.append(mat)
    root=bpy.data.objects.get('ConcreteEmplacementRoot')
    if root:obj.parent=root
    return obj

def box(name,loc,size,mat,bevel=0):
    x,y,z=[v/2 for v in size]
    obj=mesh(name,[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)],[(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],mat)
    obj.location=loc
    if bevel:
        mod=obj.modifiers.new('Cast edge chamfer','BEVEL');mod.width=bevel;mod.segments=1
        deps=bpy.context.evaluated_depsgraph_get();old=obj.data
        obj.data=bpy.data.meshes.new_from_object(obj.evaluated_get(deps),depsgraph=deps)
        obj.modifiers.clear();bpy.data.meshes.remove(old)
    return obj

def profile(name,points,mat):
    n=len(points)
    # Taper the front face back towards the upper edge.
    verts=[(x,(-.82+.12*z) if side==0 else .65,z) for side in (0,1) for x,z in points]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    obj=mesh(name,verts,faces,mat);obj.data.materials.append(edge)
    for p in obj.data.polygons:
        if p.center.z>1.6 and p.normal.z>.25:p.material_index=1
    return obj

def beam(name,a,b,width,mat):
    delta=Vector(b)-Vector(a);obj=box(name,(Vector(a)+Vector(b))/2,(width,width,delta.length),mat)
    obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return obj

def collider(obj):
    copy=obj.copy();copy.data=obj.data.copy();copy.data.materials.clear();copy.name='COL_'+obj.name
    collision.objects.link(copy);copy['collision_only']=True;copy.hide_render=True;copy.display_type='WIRE'
    return copy

if STAGE=='blockout':
    assert not bpy.data.objects.get('ConcreteEmplacementRoot')
    for obj in list(scene.objects):bpy.data.objects.remove(obj,do_unlink=True)
    root=bpy.data.objects.new('ConcreteEmplacementRoot',None);asset.objects.link(root)
    root['asset_id']='concrete_emplacement_01';root['units']='metres';root['hard_cover']=True
    root['nominal_length_m']=8;root['nominal_height_m']=2.5
    footing=box('GroundFooting',(0,.55,.17),(8.4,3.5,.34),base_mat,.07);collider(footing)
    profiles=[
        [(-4,.3),(-1.35,.3),(-1.35,2.5),(-2.7,2.5),(-2.98,2.33),(-3.22,2.4),(-3.48,2.05),(-3.72,1.98),(-4,1.52)],
        [(-1.32,.3),(1.32,.3),(1.32,2.5),(.86,2.5),(.72,2.36),(.48,2.48),(-1.32,2.5)],
        [(1.35,.3),(4,.3),(4,1.8),(3.8,1.94),(3.62,2.23),(3.35,2.17),(3.12,2.5),(1.35,2.5)],
    ]
    for i,points in enumerate(profiles):collider(profile('WallPanel_'+str(i),points,concrete))
    for x in (-2.8,0,2.8):
        verts=[(x+dx,y,z) for dx in (-.38,.38) for y,z in ((.64,.3),(2.08,.3),(1.98,.65),(.64,2.08))]
        obj=mesh('RearButtress',verts,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],base_mat)
        collider(obj)
    scene['production_stage']='blockout'
elif STAGE=='detail':
    assert scene.get('production_stage')=='blockout'
    # Disconnected cast ribs add rhythm without turning the cover into a building.
    for x in (-2.66,-1.9,-.65,.1,1.95,2.7):
        beam('CastFormSeam',(x,-.79,.4),(x,-.54,2.31),.027,base_mat)
    for x,z in ((-3.61,2.02),(-3.3,2.3),(3.75,1.96),(3.48,2.2)):
        beam('ExposedRebar',(x,.05,z-.22),(x+.12,.05,z+.3),.045,rust)
        beam('BentRebarTip',(x+.12,.05,z+.3),(x+.27,-.09,z+.35),.045,steel)
    for x in (-1.34,1.34):box('PanelJoint',(x,-.68,1.02),(.018,.018,1.18),base_mat)
    # Chipped patches sit on the raked face; no fake through-holes in a solid collider.
    rng=random.Random(31)
    for i in range(34):
        x=rng.uniform(-3.6,3.6);z=rng.uniform(.42,1.8);r=rng.uniform(.025,.085)
        coords=[(x-r,z-r*.4),(x+r*.4,z-r),(x+r,z+r*.4),(x-r*.4,z+r)]
        verts=[(px,-.82+.12*pz-.006,pz) for px,pz in coords]
        obj=mesh('ConcretePockmark',verts,[(0,1,2,3)],edge if i%4==0 else base_mat)
    for x,z,w,h in ((-2.75,.65,.16,.42),(-.7,1.8,.08,.45),(2.7,.8,.12,.53),(1.9,1.5,.09,.35)):
        verts=[(x-w,-.82+.12*(z-h)-.009,z-h),(x+w*.7,-.82+.12*(z-h)-.009,z-h),(x+w,-.82+.12*z-.009,z),(x-w*.6,-.82+.12*z-.009,z)]
        mesh('WeatherStreak',verts,[(0,1,2,3)],stain)
    for x in (-3.2,3.15):
        box('RearSteelAnchor',(x,1.55,.42),(.38,.38,.13),steel,.02)
        for dx in (-.12,.12):box('AnchorBolt',(x+dx,1.55,.52),(.07,.07,.1),rust)
    for i in range(9):
        x=(-3.65 if i<5 else 3.6)+rng.uniform(-.28,.28);y=rng.uniform(-1,1.6)
        obj=box('LooseConcrete',(x,y,.4),(rng.uniform(.15,.34),rng.uniform(.12,.3),rng.uniform(.12,.24)),gravel,.03)
        obj.rotation_euler=(rng.uniform(-.15,.15),rng.uniform(-.2,.2),rng.uniform(-1,1))
    d=bpy.data.curves.new('PositionStencil','FONT');d.body='M-04';d.size=.34;d.align_x='CENTER';d.extrude=0
    obj=bpy.data.objects.new('PositionStencil',d);asset.objects.link(obj);obj.parent=bpy.data.objects['ConcreteEmplacementRoot'];d.materials.append(stencil)
    obj.location=(1.9,-.66,1.37);obj.rotation_euler=(math.pi/2-math.atan(.12),0,0)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    bpy.context.view_layer.update()
    # Shared material groups keep the final draw count small.
    for mat in (concrete,edge,base_mat,rust,steel,stain,stencil,gravel):
        objects=[o for o in asset.objects if o.type=='MESH' and len(o.data.materials)==1 and o.data.materials[0]==mat]
        if len(objects)>1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:o.select_set(True)
            bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=mat.name+'_Geometry'
    bpy.ops.object.select_all(action='DESELECT')
    for obj in asset.objects:
        if obj.type=='MESH':obj.select_set(True)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    scene['production_stage']='detail'
elif STAGE=='export':
    assert scene.get('production_stage')=='detail'
    for obj in collision.objects:obj.hide_set(False)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in list(asset.objects)+list(collision.objects):obj.select_set(True)
    bpy.context.view_layer.objects.active=bpy.data.objects['ConcreteEmplacementRoot']
    bpy.ops.export_scene.gltf(filepath=str(OUT/'concrete_emplacement_01.glb'),export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False)
    scene['production_stage']='export'
else:raise ValueError(STAGE)
for obj in collision.objects:obj.hide_set(True)
bpy.context.view_layer.update()
visible=[o for o in asset.objects if o.type=='MESH']
for obj in visible+list(collision.objects):obj.data.calc_loop_triangles()
points=[o.matrix_world@Vector(v) for o in visible for v in o.bound_box]
stats={'stage':STAGE,'visible_meshes':len(visible),'visible_triangles':sum(len(o.data.loop_triangles) for o in visible),'materials':len({m for o in visible for m in o.data.materials}),'collision_meshes':len(collision.objects),'collision_triangles':sum(len(o.data.loop_triangles) for o in collision.objects),'bounds_min':[min(v[i] for v in points) for i in range(3)],'bounds_max':[max(v[i] for v in points) for i in range(3)],'background':bpy.app.background,'windows':len(bpy.context.window_manager.windows)}
(OUT/'model_stats.json').write_text(json.dumps(stats,indent=2)+'\n')
if bpy.context.screen:
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_distance=13
            area.spaces.active.region_3d.view_location=Vector((0,0,1));area.spaces.active.region_3d.view_rotation=Quaternion((.877,.303,.128,.351))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'concrete_emplacement_01.blend'))
result=stats
