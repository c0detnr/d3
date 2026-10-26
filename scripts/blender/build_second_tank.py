"""IRON DUST 02; Blender MCP execute stages: blockout, running_gear, detail, export.
Only the dedicated IRON_DUST_02 scene is modified. Coordinates in metres, forward -Y.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
BASE=Path('/home/mami/Projects/d3')
OUT=BASE/'assets/tanks/iron_dust_02'
scene=bpy.data.scenes['IRON_DUST_02']
bpy.context.window.scene=scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
asset=bpy.data.collections.get('ID02_Asset')
if not asset:
    asset=bpy.data.collections.new('ID02_Asset');scene.collection.children.link(asset)

def mat(name,hexcolor,metal=0,rough=.75):
    m=bpy.data.materials.get('ID02_'+name)
    if m:return m
    h=hexcolor.lstrip('#');srgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in srgb]
    m=bpy.data.materials.new('ID02_'+name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m
sand=mat('Sand','#BDAB8B',.22);dust=mat('Dust','#D5C7AB',.08,.9)
shadow=mat('ArmorShade','#99876A',.25);steel=mat('Graphite','#34383B',.65,.5)
rubber=mat('Rubber','#191D20',0,.94);glass=mat('Optics','#2F6169',.55,.18)
edge=mat('BareMetal','#858578',.75,.46);black=mat('Recess','#10151A',.05,.85)

def find(name):return next((o for o in scene.objects if o.get('asset_node_id')==name),None)
def attach(o,name,parent=None,material=None,loc=(0,0,0)):
    o.name=name;o['asset_node_id']=name
    if o.name not in asset.objects:asset.objects.link(o)
    o.parent=parent;o.location=Vector(loc)-(parent.matrix_world.translation if parent else Vector())
    if material:o.data.materials.append(material)
    bpy.context.view_layer.update()
    return o

def empty(name,loc,parent=None):
    o=bpy.data.objects.new(name,None);o.empty_display_size=.15
    return attach(o,name,parent,None,loc)
def mesh(name,verts,faces,parent,material,loc=(0,0,0)):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    return attach(bpy.data.objects.new(name,d),name,parent,material,loc)
def bevel(o,width):
    if not width:return o
    mod=o.modifiers.new('Armor edge chamfer','BEVEL');mod.width=width;mod.segments=1
    deps=bpy.context.evaluated_depsgraph_get();new=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps)
    o.modifiers.clear();old=o.data;o.data=new
    if old.users==0:bpy.data.meshes.remove(old)
    return o

def box(name,loc,size,parent,material=sand,b=.015):
    x,y,z=[a/2 for a in size]
    v=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    f=[(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
    return bevel(mesh(name,v,f,parent,material,loc),b)
def prism(name,levels,parent,material=sand):
    # Each level is a clockwise-free XY outline and height, all in world space.
    n=len(levels[0][0]);v=[(x,y,z) for outline,z in levels for x,y in outline]
    f=[tuple(reversed(range(n))),tuple(range((len(levels)-1)*n,len(levels)*n))]
    for k in range(len(levels)-1):
        for i in range(n):j=(i+1)%n;f.append((k*n+i,k*n+j,(k+1)*n+j,(k+1)*n+i))
    # Geometry is world-aligned; convert into the parent's local coordinates.
    origin=parent.matrix_world.translation
    return mesh(name,[tuple(Vector(p)-origin) for p in v],f,parent,material,tuple(origin))
def octagon(w,front,rear,ch=.3):
    return [(-w+ch,front),(w-ch,front),(w,front+ch),(w,rear-ch),(w-ch,rear),(-w+ch,rear),(-w,rear-ch),(-w,front+ch)]
def cyl(name,loc,r,depth,parent,material=steel,axis='Z',n=24,inner=0):
    v=[]
    def p(a,rad,t):
        u,w=rad*math.cos(a),rad*math.sin(a)
        return (t,u,w) if axis=='X' else ((u,t,w) if axis=='Y' else (u,w,t))
    for rad in ([r,inner] if inner else [r]):
        for t in [-depth/2,depth/2]:v.extend([p(i*math.tau/n,rad,t) for i in range(n)])
    f=[]
    # Y mapping reverses orientation compared with Z and X.
    for i in range(n):
        j=(i+1)%n;f.append((i,j,n+j,n+i))
        if inner:f.extend([(2*n+j,2*n+i,3*n+i,3*n+j),(i,2*n+i,2*n+j,j),(n+j,3*n+j,3*n+i,n+i)])
    if not inner:f.extend([tuple(reversed(range(n))),tuple(range(n,2*n))])
    if axis=='Y':f=[tuple(reversed(x)) for x in f]
    o=mesh(name,v,f,parent,material,loc)
    return o

def save():
    bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'iron_dust_02.blend'))
def stats():
    visible=[o for o in asset.objects if o.type=='MESH' and not o.get('collision_only')]
    for o in visible:o.data.calc_loop_triangles()
    points=[o.matrix_world@Vector(v) for o in visible for v in o.bound_box]
    return {'stage':STAGE,'unit':'metre','forward_axis_blender':'-Y','up_axis_blender':'+Z','turret_roof_height_m':2.83,'optics_top_height_m':3.23,'road_wheels':14,'materials':8,'collision_triangles':12,'visible_meshes':len(visible),'visible_triangles':sum(len(o.data.loop_triangles) for o in visible),'bounds_min':[min(p[i] for p in points) for i in range(3)],'bounds_max':[max(p[i] for p in points) for i in range(3)]}

if STAGE=='blockout':
    assert not find('Hull'),'Blockout already exists; do not duplicate production.'
    root=bpy.data.objects['TankRoot'];root['asset_node_id']='TankRoot';root['forward_axis']='-Y';root['up_axis']='+Z'
    for c in list(root.users_collection):c.objects.unlink(root)
    asset.objects.link(root)
    hull=prism('Hull',[(octagon(1.48,-3.45,3.5,.38),.65),(octagon(1.64,-3.85,3.65,.32),1.28),(octagon(1.55,-2.9,3.55,.24),1.68)],root)
    empty('ArmorPanels',(0,0,0),hull);empty('SideSkirts',(0,0,0),hull);empty('EngineDeck',(0,0,0),hull);empty('Exhausts',(0,0,0),hull)
    turret=empty('TurretPivot',(0,-.45,1.83),root)
    cyl('TurretRing',(0,-.45,1.78),1.12,.21,turret,steel,n=48)
    prism('TurretMesh',[(octagon(1.27,-1.85,1.85,.36),1.96),(octagon(1.49,-1.55,1.97,.30),2.38),(octagon(1.25,-1.20,1.65,.28),2.83)],turret)
    armor=empty('TurretArmor',(0,0,0),turret)
    for sign,label in [(-1,'Left'),(1,'Right')]:
        outline=[(sign*.30,-1.72),(sign*1.28,-1.52),(sign*1.58,-.76),(sign*.5,-.72)]
        if sign<0:outline.reverse()
        prism(label+'_WedgeArmor',[(outline,2.02),([(x,y-.6) for x,y in outline],2.37),([(x*.94,y+.07) for x,y in outline],2.77)],armor)
    empty('Optics',(0,0,0),turret);empty('Hatches',(0,0,0),turret)
    pitch=empty('GunPitchPivot',(0,-1.66,2.43),turret)
    box('GunMantlet',(0,-1.78,2.43),(.70,.62,.58),pitch,shadow,.07)
    recoil=empty('GunRecoilRoot',(0,-1.66,2.43),pitch)
    cyl('Barrel',(0,-4.52,2.43),.092,5.20,recoil,steel,'Y',24,inner=.065)
    cyl('ThermalSleeve',(0,-3.80,2.43),.145,3.64,recoil,sand,'Y',24,inner=.096)
    cyl('MuzzleShroud',(0,-6.89,2.43),.112,.48,recoil,steel,'Y',24,inner=.066)
    muzzle=empty('MuzzlePoint',(0,-7.135,2.43),recoil);muzzle['direction_local']=[0,-1,0]
    for side,x in [('Left',-1.55),('Right',1.55)]:
        t=empty(side+'Track',(0,0,0),root)
        box(side+'_BlockoutTrack',(x,0,.63),(.70,7.15,1.18),t,steel,.15)
    proxies=empty('CollisionProxies',(0,0,0),root)
    col=box('COL_Hull',(0,0,1.18),(3.06,7.15,1.08),proxies,sand,0);col['collision_only']=True;col.hide_render=True;col.display_type='WIRE'
    save()

elif STAGE=='running_gear':
    assert not find('Left_RoadWheel_01'),'Running gear already exists.'
    hull=find('Hull');skirts=find('SideSkirts')
    for side,x in [('Left',-1.55),('Right',1.55)]:
        parent=find(side+'Track');draft=find(side+'_BlockoutTrack')
        if draft:bpy.data.objects.remove(draft,do_unlink=True)
        for i in range(7):
            y=-2.52+i*.84
            w=cyl(f'{side}_RoadWheel_{i+1:02}',(x,y,.63),.475,.48,parent,rubber,'X',32)
            outer=x+(-.255 if x<0 else .255)
            cyl(f'{side}_WheelRim_{i+1:02}',(outer,y,.63),.36,.045,w,sand,'X',24)
            cyl(f'{side}_WheelHub_{i+1:02}',(outer+(-.03 if x<0 else .03),y,.63),.13,.08,w,steel,'X',16)
            for k in range(6):
                a=k*math.tau/6;cyl(f'{side}_HubBolt_{i}_{k}',(outer+(-.03 if x<0 else .03),y+.22*math.cos(a),.63+.22*math.sin(a)),.023,.03,w,edge,'X',6)
        for label,y in [('Idler',-3.12),('Sprocket',3.12)]:
            c=cyl(side+'_'+label,(x,y,.68),.46,.48,parent,steel,'X',24)
            cyl(side+'_'+label+'Face',(x+(-.26 if x<0 else .26),y,.68),.33,.05,c,shadow,'X',24,inner=.13)
        # Closed capsule track with 104 separate geometric shoes, merged into one mesh.
        path=[];a=3.12;r=.56
        for i in range(36):path.append((-a+2*a*i/36,.68-r))
        for i in range(16):
            angle=-math.pi/2+math.pi*i/16;path.append((a+r*math.cos(angle),.68+r*math.sin(angle)))
        for i in range(36):path.append((a-2*a*i/36,.68+r))
        for i in range(16):
            angle=math.pi/2+math.pi*i/16;path.append((-a+r*math.cos(angle),.68+r*math.sin(angle)))
        verts=[];faces=[]
        for i,(y,z) in enumerate(path):
            yn,zn=path[(i+1)%len(path)];dy,dz=yn-y,zn-z;length=math.hypot(dy,dz);ty,tz=dy/length,dz/length;ny,nz=-tz,ty
            # Two boxes per shoe: solid base plus raised central traction rib.
            for width,span,thick,lift in [(.72,length*.94,.085,0),(.60,length*.28,.045,-.06)]:
                start=len(verts)
                for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
                    verts.append((x+sx*width/2,y+ty*sy*span/2+ny*(sz*thick/2+lift),z+tz*sy*span/2+nz*(sz*thick/2+lift)))
                faces.extend([tuple(start+j for j in f) for f in [(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]])
        belt=mesh(side+'_TrackBelt',verts,faces,parent,steel)
        uv=belt.data.uv_layers.new(name='TrackTravel')
        for poly in belt.data.polygons:
            for li in poly.loop_indices:
                co=belt.data.vertices[belt.data.loops[li].vertex_index].co;vi=belt.data.loops[li].vertex_index;shoe=vi//16;
                arc=sum(math.hypot(path[(j+1)%len(path)][0]-path[j][0],path[(j+1)%len(path)][1]-path[j][1]) for j in range(shoe))
                span=math.hypot(path[(shoe+1)%len(path)][0]-path[shoe][0],path[(shoe+1)%len(path)][1]-path[shoe][1])*(.94 if vi%16<8 else .28)
                along=(-1 if vi%8 in [0,1,4,5] else 1)*span/2
                uv.data[li].uv=((co.x-x)/.72,1-(arc+along)/.22)
        belt['uv_travel_axis']='V';belt['uv_metres_per_repeat']=.22
        for i in range(7):box(side+f'_Skirt_{i+1:02}',(x+(-.29 if x<0 else .29),-2.95+i*.98,1.28),(.16,.92,.65),skirts,sand,.035)
        for y in [-3.2,3.2]:box(side+f'_Mudguard_{y}',(x,y,1.25),(.77,.42,.12),skirts,shadow,.035)
    save()

elif STAGE=='detail':
    assert not find('CommanderHatch'),'Details already exist.'
    hull=find('Hull');turret=find('TurretPivot');engine=find('EngineDeck');optics=find('Optics');hatches=find('Hatches');panels=find('ArmorPanels');exhaust=find('Exhausts');recoil=find('GunRecoilRoot')
    box('EngineRaisedDeck',(0,2.48,1.72),(2.74,1.85,.12),engine,shadow,.04)
    for x in [-.72,.72]:
        box('EngineGrilleBed_'+str(x),(x,2.45,1.795),(1.12,1.5,.025),engine,black,.01)
        for i in range(13):box('EngineLouver_'+str(x)+'_'+str(i),(x,1.79+i*.11,1.825),(1.08,.045,.035),engine,steel,.004)
    box('RearPlate',(0,3.60,1.1),(2.9,.13,.70),panels,shadow,.035)
    for x in [-1.12,1.12]:
        box('ExhaustHousing_'+str(x),(x,3.65,1.43),(.55,.24,.30),exhaust,steel,.025)
        for i in range(4):box('ExhaustSlot_'+str(x)+'_'+str(i),(x,3.779,1.33+i*.06),(.43,.01,.025),exhaust,black,.002)
        cyl('RearTowEye_'+str(x),(x,3.8,.89),.12,.09,panels,edge,'Y',16,inner=.065)
        cyl('FrontTowEye_'+str(x),(x,-3.66,.96),.105,.10,panels,steel,'Y',16,inner=.06)
    box('GlacisUpper',(0,-2.63,1.59),(2.77,1.10,.12),panels,sand,.025)
    box('DriverHatch',(-.73,-2.18,1.71),(.68,.77,.07),hull,shadow,.055)
    for x in [-.92,-.69,-.46]:box('DriverPeriscope_'+str(x),(x,-2.62,1.77),(.16,.17,.09),hull,glass,.008)
    for label,x,y in [('Commander',.65,.48),('Loader',-.68,.28)]:
        cyl(label+'Hatch',(x,y,2.88),.39,.10,hatches,shadow,n=32)
        cyl(label+'HatchLid',(x,y,2.94),.345,.035,hatches,sand,n=32)
        box(label+'HatchHandle',(x,y+.12,2.99),(.24,.055,.05),hatches,steel,.012)
        for i in range(5):
            a=math.pi+i*math.pi/4
            o=box(label+f'_Vision_{i}',(x+.36*math.cos(a),y+.36*math.sin(a),2.96),(.14,.10,.09),optics,glass,.007);o.rotation_euler.z=a
    box('PrimarySightHousing',(.96,-.9,2.88),(.43,.60,.29),optics,sand,.035)
    box('PrimarySightGlass',(.96,-1.21,2.88),(.30,.018,.16),optics,glass,.005)
    box('SightSunshade',(.96,-1.22,3.03),(.45,.18,.035),optics,steel,.01)
    cyl('PanoramicSightBase',(-.32,.95,2.99),.15,.20,optics,steel,n=16)
    box('PanoramicSight',(-.32,.95,3.14),(.30,.30,.18),optics,sand,.025)
    box('PanoramicLens',(-.32,.79,3.14),(.20,.01,.10),optics,glass,.005)
    for x in [-1.10,1.10]:
        cyl('AntennaBase_'+str(x),(x,1.36,2.83),.075,.16,turret,steel,n=12)
        cyl('Antenna_'+str(x),(x,1.36,3.52),.012,1.26,turret,steel,n=8)
        for i in range(4):
            o=cyl('SmokeTube_'+str(x)+'_'+str(i),(x*1.25,-.05+i*.22,2.5),.065,.20,turret,steel,'X',12);o.rotation_euler.y=math.radians(-25 if x<0 else 25)
    for i,y in enumerate([-2.15,-2.9,-4.7,-5.5]):cyl('SleeveBand_'+str(i),(0,y,2.43),.163,.12,recoil,shadow,'Y',24,inner=.146)
    cyl('BoreShadow',(0,-6.55,2.43),.064,.005,recoil,black,'Y',24)
    box('TurretRearStowage',(0,1.91,2.46),(2.47,.34,.45),turret,shadow,.045)
    for x in [-.86,0,.86]:box('StowageLatch_'+str(x),(x,2.09,2.48),(.10,.035,.20),turret,steel,.01)
    for side,x in [('Left',-1.85),('Right',1.85)]:
        for i in range(7):
            y=-2.95+i*.98
            box(side+f'_SkirtDust_{i}',(x,y,1.02),(.164,.84,.10),find('SideSkirts'),dust,.006)
            for yy in [y-.32,y+.32]:cyl(side+f'_SkirtBolt_{i}_{yy}',(x+(-.09 if x<0 else .09),yy,1.50),.026,.018,find('SideSkirts'),edge,'X',6)
    # Sparse exposed edges on front cheeks, avoiding random surface noise.
    for x in [-1.13,1.13]:box('CheekWear_'+str(x),(x,-2.10,2.40),(.28,.018,.02),find('TurretArmor'),dust,.003)
    save()

elif STAGE=='polish':
    root=find('TankRoot');root['road_wheels']=14;root['temporary_min_elevation_deg']=-8;root['asset_status']='Model and GLB validated; gameplay tuning temporary'
    # Keep the wheel's outer face inside the skirt throughout the suspension stroke.
    for o in list(asset.objects):
        if '_Skirt_' in o.name or '_SkirtDust_' in o.name or '_SkirtBolt_' in o.name:
            o.location.x += -.13 if o.name.startswith('Left') else .13
    # Collapse decorative meshes by moving group, keeping all contract nodes intact.
    protected={'TankRoot','Hull','TurretPivot','TurretMesh','TurretArmor','Optics','Hatches','GunPitchPivot','GunMantlet','GunRecoilRoot','Barrel','ThermalSleeve','MuzzleShroud','MuzzlePoint','ArmorPanels','SideSkirts','EngineDeck','Exhausts','LeftTrack','RightTrack','Left_TrackBelt','Right_TrackBelt','CollisionProxies','COL_Hull','Left_Idler','Right_Idler','Left_Sprocket','Right_Sprocket'}
    protected.update(f'{side}_RoadWheel_{i:02}' for side in ['Left','Right'] for i in range(1,8))
    for par in list(asset.objects):
        children=[o for o in list(par.children) if o.type=='MESH' and o.get('asset_node_id') not in protected]
        if len(children)<2:continue
        verts=[];faces=[];mats=[];indices=[]
        bpy.context.view_layer.update();inv=par.matrix_world.inverted()
        for o in children:
            transform=inv@o.matrix_world;offset=len(verts)
            verts.extend(tuple(transform@v.co) for v in o.data.vertices)
            for m in o.data.materials:
                if m not in mats:mats.append(m)
            for f in o.data.polygons:
                faces.append(tuple(offset+i for i in f.vertices));indices.append(mats.index(o.data.materials[f.material_index]))
        merged=mesh(par.name+'_Details',verts,faces,par,None,tuple(par.matrix_world.translation))
        for m in mats:merged.data.materials.append(m)
        for poly,index in zip(merged.data.polygons,indices):poly.material_index=index
        for o in children:bpy.data.objects.remove(o,do_unlink=True)
    save()

elif STAGE=='export':
    bpy.ops.object.select_all(action='DESELECT')
    for o in asset.objects:o.select_set(True)
    bpy.context.view_layer.objects.active=find('TankRoot')
    bpy.ops.export_scene.gltf(filepath=str(OUT/'iron_dust_02.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_extras=True,export_apply=True,export_cameras=False,export_lights=False)
    save()
else:raise ValueError(STAGE)
result=stats()
(OUT/'model_stats.json').write_text(json.dumps(result,indent=2))
