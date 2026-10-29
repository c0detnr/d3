"""Reinforced military command bunker (original design) for the Kul Vadisi bases.

blender -b --factory-startup -P scripts/blender/build_command_center.py
Front (armoured door) faces -Y. Closed and not enterable: tiered concrete hall, narrow command
tier with slit windows, roof comms (lattice mast, dish, vents). Footprint stays within the 30 x 24 m
blockout. Colliders: sloped plinth, hall, command tier and the two door buttresses.
"""
import sys, math
sys.path.insert(0, '/home/mami/Projects/d3/scripts/blender')
from landmark_common import Builder

b = Builder('command_center_01', 'IRON_DUST_COMMAND_CENTER_01', 'CC01')
concrete = b.material('Concrete', '77796B', 0, .9); olive = b.material('Olive', '60674C', .2, .8)
steel = b.material('GraphiteSteel', '343D3B', .55, .65); roof = b.material('Roof', '48534B', .35, .78)
recess = b.material('Recess', '1D2829', .1, .9); yellow = b.material('SafetyYellow', 'BB9646', .15, .8)
glass = b.material('SmokedGlass', '45666B', .25, .6); rust = b.material('Oxide', '79533C', .25, .85)


def plan(name, cx, cy, w, d, c, z0, z1, mat, top_mat=None, taper=0.0):
    """Chamfered-rectangle solid; `taper` shrinks the top ring (sloped sides)."""
    def ring(w, d, z):
        x, y = w / 2, d / 2
        return [(cx - x + c, cy - y, z), (cx + x - c, cy - y, z), (cx + x, cy - y + c, z), (cx + x, cy + y - c, z),
                (cx + x - c, cy + y, z), (cx - x + c, cy + y, z), (cx - x, cy + y - c, z), (cx - x, cy - y + c, z)]
    return b.loft(name, ring(w, d, z0), ring(w - 2 * taper, d - 2 * taper, z1), mat, top_mat)


# ---- main masses --------------------------------------------------------------------------
PLINTH_Z, HALL_Z, TIER_Z, TIER_TOP = .8, 7.0, 10.6, 11.1
plinth = plan('Plinth', 0, 0, 29, 23, 1.4, 0, PLINTH_Z, concrete, taper=.4)
hall = plan('Hall', 0, 0, 25, 19, 1.5, PLINTH_Z, HALL_Z, concrete)
hall_cap = plan('HallCap', 0, 0, 26, 20, 1.6, HALL_Z, 7.5, roof)
TCY = 1.5   # command tier sits toward the rear so the front reads as a stepped bunker
tier = plan('Tier', 0, TCY, 15, 11, 1.0, 7.5, TIER_Z, concrete)
tier_cap = plan('TierCap', 0, TCY, 16, 12, 1.1, TIER_Z, TIER_TOP, roof)
b.collider(plinth)
b.mark_collider(plan('COL_Hall', 0, 0, 26, 20, 1.6, PLINTH_Z, 7.5, None))
b.mark_collider(plan('COL_Tier', 0, TCY, 16, 12, 1.1, 7.5, TIER_TOP, None))

# Olive armour band under the hall roof and a safety-yellow kerb stripe on the plinth.
for y in (-9.58, 9.58): b.box('OliveBandFB', (0, y, 6.3), (23.6, .2, 1.1), olive)
for x in (-12.58, 12.58): b.box('OliveBandSide', (x, 0, 6.3), (.2, 17.6, 1.1), olive)
for y in (-11.1, 11.1): b.box('PlinthStripeFB', (0, y, PLINTH_Z + .005), (24, .5, .02), yellow)

# ---- armoured entrance --------------------------------------------------------------------
b.box('DoorFrame', (0, -9.8, 3.7), (8.2, .6, 5.8), steel)
b.box('DoorLeafL', (-1.6, -10.13, 3.45), (3.1, .12, 5.0), olive)
b.box('DoorLeafR', (1.6, -10.13, 3.45), (3.1, .12, 5.0), olive)
b.box('DoorSeam', (0, -10.2, 3.45), (.14, .08, 5.0), recess)
b.box('DoorLintelStripe', (0, -10.16, 6.35), (8.2, .06, .34), yellow)
for x in (-2.2, 2.2): b.box('DoorBolt', (x, -10.2, 3.45), (.16, .06, 4.4), steel)
b.box('DoorLampL', (-4.9, -10.0, 5.9), (.5, .35, .35), yellow); b.box('DoorLampR', (4.9, -10.0, 5.9), (.5, .35, .35), yellow)
# Sloped buttresses flank the door (side profile u=Y, thickness along X).
for sx, nm in ((-6.6, 'L'), (6.6, 'R')):
    prof = [(-9.5, PLINTH_Z), (-11.5, PLINTH_Z), (-11.5, 5.4), (-9.5, 7.0)]
    p = b.prism('Buttress' + nm, prof, 'y', sx - 1.2, sx + 1.2, concrete)
    b.collider(p)
    b.box('ButtressSlit' + nm, (sx, -11.52, 3.4), (.9, .06, .4), recess)
# ---- wall ribs and slit windows -------------------------------------------------------------
for x in (-11.3, 11.3): b.box('RibFront', (x, -9.65, 3.9), (.7, .3, 6.2), olive)
for x in (-11.3, -7.6, -3.8, 0, 3.8, 7.6, 11.3): b.box('RibRear', (x, 9.65, 3.9), (.7, .3, 6.2), olive)
for y in (-7.2, -2.6, 2.0, 6.6):
    for x in (-12.65, 12.65): b.box('RibSide', (x, y, 3.9), (.3, .7, 6.2), olive)
for x in (-4.8, -2.4, 0, 2.4, 4.8): b.box('TierSlitFront', (x, TCY - 5.54, 9.1), (1.6, .1, .6), glass)
for y in (TCY - 3.2, TCY, TCY + 3.2):
    for x in (-7.54, 7.54): b.box('TierSlitSide', (x, y, 9.1), (.1, 1.4, .6), glass)
for x in (-4.2, 0, 4.2): b.box('TierSlitRear', (x, TCY + 5.54, 9.1), (1.6, .1, .6), glass)
for x in (-9.5, 9.5): b.box('HallSlitFront', (x, -9.52, 5.1), (1.4, .06, .35), recess)
for x in (-9, 9): b.box('HallVentFront', (x, -9.55, 2.4), (2.0, .08, .9), steel)
b.box('TierStripe', (0, TCY - 5.56, 10.3), (15.2, .06, .22), yellow)

# ---- roof equipment ---------------------------------------------------------------------------
for x, y in ((-8.5, -5.5), (-8.5, 4.5), (8.5, 7.0)): b.box('RoofUnit', (x, y, 7.5 + .7), (3.4, 2.2, 1.4), steel)
for x, y in ((8.2, -4.8), (9.8, -4.8), (8.2, -2.8)):
    b.cylinder('VentStack', (x, y, 7.5 + .8), .42, 1.6, steel, 8); b.cylinder('VentCap', (x, y, 7.5 + 1.7), .6, .2, rust, 8)
b.box('RoofHatch', (6.5, 5.5, 7.5 + .25), (2.4, 2.4, .5), olive)
# Satellite dish on the tier roof, opening toward the front and up.
b.cylinder('DishPole', (4.2, TCY + 2.5, TIER_TOP + .6), .14, 1.2, steel, 6)
b.cylinder('Dish', (4.2, TCY + 2.5, TIER_TOP + 1.5), .12, .5, steel, 12, radius2=1.15, rot=(1.0, 0, 0))
# Lattice mast: four legs, three braced levels, antenna whip and a beacon.
MX, MY, Z0, Z1 = -5.0, TCY + 3.2, TIER_TOP, 13.3
legs = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
for i, (sx, sy) in enumerate(legs):
    b.beam(f'MastLeg{i}', (MX + sx * .8, MY + sy * .8, Z0), (MX + sx * .28, MY + sy * .28, Z1), .16, steel)
levels = [(Z0 + .3, .8), (Z0 + 1.55, .63), (Z0 + 2.8, .45), (Z1, .28)]
for k, (z, h) in enumerate(levels):
    for i, (sx, sy) in enumerate(legs):
        nx, ny = legs[(i + 1) % 4]
        b.beam(f'MastRing{k}{i}', (MX + sx * h, MY + sy * h, z), (MX + nx * h, MY + ny * h, z), .1, steel)
for k in range(len(levels) - 1):
    (z0, h0), (z1, h1) = levels[k], levels[k + 1]
    for i, (sx, sy) in enumerate(legs[:2]):
        nx, ny = legs[(i + 1) % 4]
        b.beam(f'MastBrace{k}{i}', (MX + sx * h0, MY + sy * h0, z0), (MX + nx * h1, MY + ny * h1, z1), .07, steel)
b.cylinder('MastTop', (MX, MY, Z1 + .25), .1, .5, steel, 6)
b.cylinder('Whip', (MX, MY, Z1 + .75), .035, 1.0, steel, 6)
b.box('Beacon', (MX, MY, Z1 + .08), (.34, .34, .3), yellow)
# Floodlight poles at the front plinth corners.
for x in (-13.2, 13.2):
    b.cylinder('LightPole', (x, -10.4, PLINTH_Z + 3.0), .12, 6.0, steel, 6)
    b.box('LightHead', (x, -10.55, PLINTH_Z + 6.1), (1.0, .5, .4), yellow)
# Rear fuel tank and conduit run.
b.cylinder('FuelTank', (8.6, 10.5, PLINTH_Z + .95), .9, 5.0, rust, 10, axis='X')
for dx in (-1.7, 1.7): b.box('TankSaddle', (8.6 + dx, 10.5, PLINTH_Z + .3), (.4, 1.6, .6), concrete)
b.box('Conduit', (-12.55, 0, 1.6), (.2, 17, .24), steel)

b.finalize({'landmark': 'command_center', 'nominal_height_m': 14.5, 'footprint_max_m': [29, 23]})
