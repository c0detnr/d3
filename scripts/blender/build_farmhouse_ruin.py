"""Ruined single-storey stone farmhouse for the Kul Vadisi centre.

blender -b --factory-startup -P scripts/blender/build_farmhouse_ruin.py
Front (south, door side) faces -Y. Tall NE corner + chimney give the far silhouette; the
south wall is hull-height cover. The interior and the collapsed SW corner are filled with
rubble mounds whose exact meshes are colliders, so a tank cannot enter or wedge inside.
"""
import sys, math, random
sys.path.insert(0, '/home/mami/Projects/d3/scripts/blender')
from landmark_common import Builder

b = Builder('farmhouse_ruin_01', 'IRON_DUST_FARMHOUSE_RUIN_01', 'FR01')
stone = b.material('LimeStone', '8A8574'); fracture = b.material('FreshFracture', 'B3A88E')
plinth = b.material('DarkFooting', '5E6156'); quoin = b.material('Quoin', 'A39A82')
timber = b.material('CharredTimber', '3F3830', rough=.92); tile = b.material('RoofTile', '9D6F50')
rubble = b.material('Rubble', '7D7A69', rough=.95); soot = b.material('Soot', '55564D', rough=.95)
rng = random.Random(7)

X0, X1, Y0, Y1, T = -5.2, 5.2, -3.6, 3.6, .5   # outer walls, 0.5 m stone

def wall(name, outline, axis, t0, t1, solid=True):
    obj = b.prism(name, outline, axis, t0, t1, stone, fracture)
    if solid: b.collider(obj)
    return obj

# Footing visible as a 10 cm lip around the building.
b.collider(b.box('Footing', (0, 0, .09), (X1 - X0 + .3, Y1 - Y0 + .3, .18), plinth))

# North (rear) wall: tallest run, broken window, ends at the chimney.
wall('NorthWallW', [(X0, 0), (-1.0, 0), (-1.0, 3.3), (-1.6, 3.5), (-2.4, 3.1), (-3.3, 3.25), (-4.0, 2.7), (-4.6, 2.85), (X0, 2.4)], 'x', Y1 - T, Y1)
wall('NorthSill', [(-1.0, 0), (.2, 0), (.2, 1.1), (-.4, 1.02), (-1.0, 1.1)], 'x', Y1 - T, Y1)
wall('NorthLintel', [(-1.0, 2.2), (.2, 2.2), (.2, 3.6), (-.4, 3.42), (-1.0, 3.5)], 'x', Y1 - T, Y1)
wall('NorthWallE', [(.2, 0), (3.9, 0), (3.9, 4.0), (3.2, 3.95), (2.6, 3.65), (1.9, 3.88), (1.2, 3.45), (.2, 3.6)], 'x', Y1 - T, Y1)
# East wall: steps down from the 4 m corner to hull height at the front.
wall('EastWallN', [(.6, 0), (2.9, 0), (2.9, 3.95), (2.2, 3.6), (1.5, 3.3), (1.05, 3.05), (.6, 2.9)], 'y', X1 - T, X1)
wall('EastSill', [(-.6, 0), (.6, 0), (.6, 1.0), (-.6, 1.0)], 'y', X1 - T, X1)
wall('EastLintel', [(-.6, 2.0), (.6, 2.0), (.6, 2.85), (0, 2.6), (-.6, 2.4)], 'y', X1 - T, X1)
wall('EastWallS', [(Y0, 0), (-.6, 0), (-.6, 2.4), (-1.3, 2.1), (-2.0, 2.2), (-2.7, 1.7), (Y0, 1.6)], 'y', X1 - T, X1)
# South (front) wall: hull-height cover with a narrow 1.2 m doorway.
wall('SouthWallW', [(-3.8, 0), (1.2, 0), (1.2, 2.2), (.5, 1.9), (-.4, 1.6), (-1.5, 1.72), (-2.4, 1.3), (-3.3, 1.42), (-3.8, 1.2)], 'x', Y0, Y0 + T)
wall('SouthWallE', [(2.4, 0), (X1, 0), (X1, 1.6), (4.6, 1.9), (3.9, 1.7), (3.2, 2.35), (2.4, 2.5)], 'x', Y0, Y0 + T)
b.box('DoorStep', (1.8, Y0 + .1, .1), (1.2, .7, .2), quoin)
# West wall: mid height, open-topped broken window, collapsed at the SW corner.
wall('WestWallN', [(1.7, 0), (Y1, 0), (Y1, 2.4), (3.0, 2.62), (2.3, 2.2), (1.7, 2.32)], 'y', X0, X0 + T)
wall('WestSill', [(.5, 0), (1.7, 0), (1.7, 1.0), (1.1, .9), (.5, 1.05)], 'y', X0, X0 + T)
wall('WestWallS', [(-2.2, 0), (.5, 0), (.5, 2.0), (-.3, 1.8), (-1.2, 1.5), (-2.2, 1.2)], 'y', X0, X0 + T)

# Chimney stack in the NE corner: the landmark silhouette.
ch = b.box('ChimneyBase', (4.62, 3.32, 2.5), (1.42, 1.16, 5.0), stone); b.collider(ch)
b.collider(b.box('ChimneyStack', (4.6, 3.35, 5.45), (.9, .8, .9), stone))
b.box('ChimneyCap', (4.6, 3.35, 5.97), (1.1, 1.0, .14), quoin)
b.box('ChimneyFlue', (4.6, 3.35, 6.06), (.4, .36, .06), soot)
for i, z in enumerate((.42, 1.24, 2.06, 2.88, 3.7, 4.52)):
    b.box('ChimneyQuoin', (5.35 if i % 2 else 5.28, 3.92, z), (.25 if i % 2 else .4, .14, .4), quoin)

# Corner quoins and opening dressings, slightly proud of the wall face.
for x, y, hmax in ((X0, Y1, 2.3), (X1, Y0, 1.5), (X0, -2.2, 1.1)):
    for i, z in enumerate([z for z in (.42, .9, 1.38, 1.86, 2.34) if z < hmax]):
        long = i % 2 == 0
        b.box('Quoin', (x + (.05 if x < 0 else -.05), y + (-.05 if y > 0 else .05), z), (.62 if long else .38, .62 if not long else .38, .44), quoin)
for x0, x1, z in ((-1.0, .2, 1.1), (-1.0, .2, 2.2)):
    b.box('WindowDressing', ((x0 + x1) / 2, Y1 + .03, z), (x1 - x0 + .25, .1, .14), quoin)
for z in (1.0, 2.0):
    b.box('WindowDressing', (X1 + .03, 0, z), (.1, 1.45, .14), quoin)
for x in (1.15, 2.45):
    b.box('DoorJamb', (x, Y0 - .03, .9), (.18, .1, 1.8), quoin)

# Fire and weather staining over openings (thin quads on the outer faces).
def streak(x0, x1, z0, z1, y=None, x=None):
    if y is not None: b.mesh('SootStreak', [(x0, y, z0), (x1, y, z0), (x1 + .15, y, z1), (x0 - .1, y, z1)], [(0, 1, 2, 3)], soot, recalc=False)
    else: b.mesh('SootStreak', [(x, x0, z0), (x, x1, z0), (x, x1 + .15, z1), (x, x0 - .1, z1)], [(0, 1, 2, 3)], soot, recalc=False)
streak(-.95, .15, 2.32, 3.2, y=Y1 + .012); streak(-.5, .5, 2.12, 2.6, x=X1 + .012); streak(1.25, 2.35, 1.9, 2.4, y=Y0 - .012)
streak(.6, 1.6, 1.0, 1.9, x=X0 - .012); streak(4.1, 5.1, 4.2, 5.0, y=3.912)

# Collapsed interior: a faceted rubble mound fills the rooms (exact collider).
def mound(name, cx, cy, rx, ry, h, rings=3, seg=9, floor=0.0):
    verts, faces = [], []
    for r in range(rings):
        t = (r + 1) / rings; rad = 1 - t * .82
        for s in range(seg):
            a = 2 * math.pi * s / seg + r * .3
            jitter = 1 + rng.uniform(-.14, .14)
            verts.append((cx + math.cos(a) * rx * rad * jitter, cy + math.sin(a) * ry * rad * jitter, floor + h * (t ** .7) * rng.uniform(.82, 1.0) if r else floor + .05))
    verts.append((cx + rng.uniform(-.2, .2), cy + rng.uniform(-.2, .2), floor + h)); top = len(verts) - 1
    faces.append(tuple(reversed(range(seg))))
    for r in range(rings - 1):
        for s in range(seg):
            a, c = r * seg + s, r * seg + (s + 1) % seg
            faces += [(a, c, c + seg), (a, c + seg, a + seg)]
    for s in range(seg): faces.append(((rings - 1) * seg + s, (rings - 1) * seg + (s + 1) % seg, top))
    return b.mesh(name, verts, faces, rubble)

# Interior fill: a low box under the mound keeps the room solid edge to edge.
fill = b.prism('InteriorFill', [(X0 + T - .02, 0), (X1 - T + .02, 0), (X1 - T + .02, .75), (X0 + T - .02, .75)], 'x', Y0 + T - .02, Y1 - T + .02, rubble)
b.collider(fill)
b.collider(mound('InteriorRubble', -.4, .3, 4.6, 3.2, 1.15, rings=3, seg=10, floor=.55))
b.collider(mound('CornerRubble', -4.7, -2.95, 2.0, 1.85, 1.7, rings=3, seg=9))
for i in range(16):
    x = -4.8 + rng.uniform(-1.2, 1.4); y = -3.0 + rng.uniform(-1.1, 1.2)
    if x < -5.9 or y < -4.45: continue
    blk = b.box('FallenBlock', (x, y, rng.uniform(.15, .65)), (rng.uniform(.3, .6), rng.uniform(.25, .45), rng.uniform(.2, .3)), stone if i % 3 else fracture,
                rot=(rng.uniform(-.4, .4), rng.uniform(-.4, .4), rng.uniform(-1.5, 1.5)))
for i in range(10):
    b.box('InteriorBlock', (rng.uniform(-3.8, 3.8), rng.uniform(-2.4, 2.4), rng.uniform(1.0, 1.6)), (rng.uniform(.3, .55), rng.uniform(.25, .4), .22), stone,
          rot=(rng.uniform(-.5, .5), rng.uniform(-.5, .5), rng.uniform(-1.5, 1.5)))
# Front skirt of debris at the doorway so the gap reads blocked, not enterable.
b.collider(mound('DoorRubble', 1.8, -2.75, .9, .7, 1.05, rings=2, seg=7, floor=.0))

# Broken roof: charred rafters fallen from the tall north wall into the rubble.
for x, top, foot in ((-2.6, 3.15, (-2.2, -.6, 1.25)), (.9, 3.45, (1.4, -1.3, 1.0)), (2.9, 3.6, (3.4, .2, 1.45))):
    b.beam('FallenRafter', (x, Y1 - .25, top + .06), foot, .2, timber, .26)
b.beam('RidgeBeam', (X1 - .25, 1.8, 3.4), (-.8, 1.1, 1.75), .24, timber, .28)
b.beam('WallPlate', (X0 + .25, 3.3, 2.45), (-1.4, 3.3, 3.15), .18, timber, .22)
b.beam('LintelBeam', (1.0, Y0 - .6, .12), (2.8, Y0 - 1.05, .2), .2, timber, .22)
for x, y, z, a in ((-1.6, .4, 1.92, .2), (.3, -.8, 1.72, -.4), (2.2, .9, 1.88, .7), (-3.0, -1.4, 1.48, 1.1),
                   (3.3, -1.6, 1.4, -.9), (-.4, 2.1, 1.76, .3), (-4.3, -2.5, 1.5, 1.6)):
    b.box('RoofTiles', (x, y, z), (.9, .55, .05), tile, rot=(rng.uniform(-.25, .25), rng.uniform(-.25, .25), a))

b.finalize({'landmark': 'ruin', 'nominal_height_m': 4.0, 'footprint_max_m': [12, 9]})
