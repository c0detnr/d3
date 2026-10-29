"""Burned-out fictional armored vehicle wreck (original design) for the Kul Vadisi centre.

blender -b --factory-startup -P scripts/blender/build_armored_wreck.py
Vehicle front faces +X. Left (+Y) track snapped: wheels exposed, the belt lies flat on the
ground and trails behind the hull. Turret knocked off its ring and slewed. One collider
covers hull + running gear down to the ground; a second matches the turret.
"""
import sys, math, random
sys.path.insert(0, '/home/mami/Projects/d3/scripts/blender')
from mathutils import Euler, Vector, Matrix
from landmark_common import Builder

b = Builder('armored_wreck_01', 'IRON_DUST_ARMORED_WRECK_01', 'AW01')
paint = b.material('BurntPaint', '434A3E', .1, .9); char = b.material('Char', '2F302C', .15, .95)
ash = b.material('AshDust', '5F5C55', 0, .95); rust = b.material('Rust', '6F4632', .25, .9)
rust_hi = b.material('RustLight', '8F6146', .2, .88); track = b.material('TrackGraphite', '34383B', .5, .78)
rng = random.Random(11)

HW, TW = 1.62, .52   # half hull width incl. tracks, track width
# Lower hull between the tracks and upper hull spanning the tracks (side profile u=X).
b.prism('LowerHull', [(-2.95, .42), (2.25, .42), (3.12, 1.05), (-3.1, 1.05)], 'x', -HW + TW, HW - TW, char)
upper = b.prism('UpperHull', [(-3.12, 1.0), (3.15, 1.0), (3.15, 1.18), (2.05, 1.62), (-2.85, 1.62), (-3.12, 1.42)], 'x', -HW, HW, paint, ash)
# Collider: hull + both running gear volumes down to the ground (no gap to wedge into).
b.mark_collider(b.prism('COL_HullAndRunningGear', [(-3.2, 0), (2.95, 0), (3.2, .95), (3.15, 1.18), (2.05, 1.62), (-2.85, 1.62), (-3.15, 1.42)], 'x', -HW, HW, None))

# Intact right (-Y) track as a solid belt outline with wheels proud of it.
belt = [(-2.6, 0), (2.35, 0), (2.85, .32), (3.05, .72), (2.9, .95), (-3.0, .95), (-3.2, .68), (-3.05, .3)]
b.prism('RightTrack', belt, 'x', -HW, -HW + TW, track)
for x in (-2.2, -1.35, -.5, .35, 1.2, 2.0):
    b.cylinder('RoadWheelR', (x, -HW - .03, .36), .33, .1, char, 10, rot=(math.pi / 2, 0, 0))
    b.cylinder('HubR', (x, -HW - .09, .36), .12, .06, rust, 6, rot=(math.pi / 2, 0, 0))
b.cylinder('SprocketR', (2.78, -HW - .03, .66), .27, .12, rust, 8, rot=(math.pi / 2, 0, 0))
for i in range(16):  # grousers on the visible top run
    x = -2.9 + i * .37
    b.box('Grouser', (x, -HW + TW / 2, .975), (.09, TW + .02, .05), track)

# Broken left (+Y) side: bare wheels standing on the fallen lower run; one wheel missing.
for i, x in enumerate((-2.2, -1.35, -.5, .35, 1.2, 2.0)):
    if i == 3: continue
    tilt = .12 if i == 4 else 0
    b.cylinder('RoadWheelL', (x, HW - TW / 2, .41), .33, .42, rust if i == 1 else char, 10, rot=(math.pi / 2 + tilt, 0, 0))
b.cylinder('SprocketL', (2.78, HW - TW / 2, .7), .27, .38, rust_hi, 8, rot=(math.pi / 2, 0, 0))
b.cylinder('IdlerL', (-2.98, HW - TW / 2, .62), .26, .38, char, 8, rot=(math.pi / 2, 0, 0))
b.cylinder('WheelStub', (.35, HW - TW / 2, .41), .1, .5, rust, 6, rot=(math.pi / 2, 0, 0))

# Fallen track: flat links under the wheels, trailing out behind and slewing inwards.
def link(i, x, y, z, yaw=0.0, pitch=0.0):
    m = rust if i % 7 == 3 else track
    b.box('TrackLink', (x, y, z), (.17, TW, .07 if i % 2 else .09), m, rot=(0, pitch, yaw))
for i in range(30):
    link(i, 2.6 - i * .19, HW - TW / 2, .046)
for i in range(4):   # tail curling inwards behind the hull
    a = .12 + i * .1
    link(i, -3.15 - i * .17, HW - TW / 2 - i * i * .03, .046, yaw=a)
for i in range(4):   # end still hanging from the sprocket
    link(i, 3.0 + i * .045, HW - TW / 2, .18 + i * .17, pitch=-1.2)

# Hull dressing: fenders (one bent), glacis lights, engine deck, tow hooks, rust patches.
b.box('FenderR', (2.85, -HW + TW / 2, 1.2), (.6, TW + .06, .04), paint, rot=(0, .32, 0))
b.box('FenderBentL', (3.12, HW - .18, .92), (.55, .45, .04), rust_hi, rot=(.5, .9, .2))
for y in (-.85, .85):
    b.box('TowHook', (3.17, y, .9), (.12, .16, .14), rust)
    b.box('LightGuard', (2.7, y * 1.1, 1.36), (.18, .22, .12), char, rot=(0, .38, 0))
b.box('EngineDeck', (-2.0, 0, 1.635), (1.3, 2.2, .04), char)
for i in range(6):
    b.box('GrilleSlat', (-2.55 + i * .22, 0, 1.67), (.08, 2.0, .04), rust if i % 2 else char)
b.box('ExhaustBox', (-3.16, .9, 1.25), (.18, .55, .28), rust_hi)
b.box('ExhaustBox', (-3.16, -.9, 1.25), (.18, .55, .28), char)
b.box('SkirtPanelR', (-.7, -HW - .1, .78), (1.5, .04, .42), paint, rot=(.12, 0, .03))
for x, y in ((1.5, .9), (-.9, -1.1), (2.2, -.4)):
    b.mesh('RustPatch', [(x - .32, y - .22, 1.623), (x + .28, y - .26, 1.623), (x + .34, y + .2, 1.623), (x - .25, y + .27, 1.623)], [(0, 1, 2, 3)], rust, recalc=False)
for x, w in ((-1.9, .6), (.6, .8), (1.9, .5)):
    b.mesh('SootSide', [(x - w, HW + .006, 1.02), (x + w, HW + .006, 1.02), (x + w * .7, HW + .006, 1.55), (x - w * .5, HW + .006, 1.55)], [(0, 1, 2, 3)], char, recalc=False)
b.cylinder('TurretRing', (-.1, 0, 1.64), 1.0, .05, char, 12)
b.cylinder('RingGap', (-.1, 0, 1.665), .84, .02, track, 12)

# Turret: angular wedge knocked off its ring, slewed and tilted (local frame, then placed).
turret_parts = []
outline = [(1.3, 0), (.85, .98), (-1.05, 1.05), (-1.45, .62), (-1.45, -.62), (-1.05, -1.05), (.85, -.98)]
bottom = [(x, y, 0) for x, y in outline]
top = [(x * .82 - .1, y * .8, .6) for x, y in outline]
turret = b.loft('Turret', bottom, top, char, rust)
turret_parts.append(turret)
turret_parts.append(b.box('Mantlet', (1.33, 0, .32), (.36, .62, .44), paint))
turret_parts.append(b.cylinder('BarrelSleeve', (1.82, 0, .34), .14, .65, char, 8, axis='X'))
turret_parts.append(b.cylinder('GunBarrel', (2.5, 0, .34), .1, 1.3, char, 8, axis='X'))
turret_parts.append(b.cylinder('BarrelBreak', (3.17, 0, .34), .12, .08, rust_hi, 8, axis='X', radius2=.09))
turret_parts.append(b.cylinder('Cupola', (-.55, .42, .68), .32, .18, char, 8))
turret_parts.append(b.cylinder('CupolaRim', (-.55, .42, .78), .25, .03, rust, 8))
turret_parts.append(b.box('Sight', (.25, -.55, .68), (.36, .28, .2), paint))
for side in (-1, 1):
    for i in range(3):
        turret_parts.append(b.cylinder('SmokeTube', (.35 - i * .2, side * .98, .5), .07, .26, rust if i == 1 else char, 6, rot=(-side * .6, 0, 0)))
turret_parts.append(b.box('BustleRack', (-1.62, 0, .42), (.3, 1.3, .06), rust))
place = Matrix.Translation((.3, .3, 1.6)) @ Euler((.09, -.05, -.45)).to_matrix().to_4x4() @ Matrix.Scale(1.1, 4)
for o in turret_parts:
    o.matrix_basis = place @ o.matrix_basis
b.collider(turret, 'COL_Turret')
# Barrel droops: pivot about the mantlet.
barrel = [o for o in turret_parts if o.name.startswith(('GunBarrel', 'BarrelBreak'))]
pivot = place @ Vector((1.33, 0, .34))
droop = Matrix.Translation(pivot) @ Matrix.Rotation(.09, 4, (place.to_3x3() @ Vector((0, 1, 0))).normalized()) @ Matrix.Translation(-pivot)
for o in barrel: o.matrix_basis = droop @ o.matrix_basis

# Blown-off hatch on the deck, a side plate leaning on the bare wheels, lifted glacis plate.
b.cylinder('HatchBlown', (-2.35, -.75, 1.68), .3, .05, rust, 8, rot=(.12, -.08, 0))
b.box('SidePlateFallen', (-1.0, HW + .12, .5), (1.9, .05, .62), paint, rot=(-.42, 0, .04))
b.box('GlacisPlateLifted', (2.55, .35, 1.42), (.75, 1.0, .05), rust_hi, rot=(0, -.62, .1))
for x, y, w in ((.4, -.4, .9), (-1.2, .5, .7), (2.4, -.9, .5)):
    b.mesh('SootTop', [(x - w, y - .5, 1.624), (x + w, y - .45, 1.624), (x + w * .6, y + .5, 1.624), (x - w * .8, y + .4, 1.624)], [(0, 1, 2, 3)], char, recalc=False)
for x, w in ((-1.6, .7), (.9, .6)):
    b.mesh('SootSideR', [(x - w, -HW - .006, 1.02), (x + w, -HW - .006, 1.02), (x + w * .6, -HW - .006, 1.55), (x - w * .6, -HW - .006, 1.55)], [(0, 1, 2, 3)], char, recalc=False)
# Scattered debris on the ground next to the broken side.
for i in range(6):
    b.box('Debris', (rng.uniform(-2.5, 2.4), rng.uniform(HW - .1, HW + .1), .05), (rng.uniform(.18, .4), rng.uniform(.1, .2), .07), rust if i % 2 else char,
          rot=(0, 0, rng.uniform(-1.2, 1.2)))

b.finalize({'landmark': 'wreck', 'surface': 'metal', 'nominal_height_m': 2.45, 'footprint_max_m': [7.6, 3.7]})
