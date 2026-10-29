"""blender -b --factory-startup -P scripts/blender/validate_armored_wreck.py  (GLB reimport in an empty scene)"""
import sys
sys.path.insert(0, '/home/mami/Projects/d3/scripts/blender')
from landmark_common import validate_glb

def extra(visible, colliders):
    hull = next(o for o in colliders if o.name.startswith('COL_HullAndRunningGear'))
    zs = [(hull.matrix_world @ v.co).z for v in hull.data.vertices]
    assert min(zs) < .02 and max(zs) > 1.55, ('hull collider reaches the ground', min(zs), max(zs))
    return {'hull_collider_z_m': [round(min(zs), 3), round(max(zs), 3)]}

validate_glb('armored_wreck_01', 2, (2.2, 2.6), (7.6, 3.75), extra,
             'Hull + running gear block (ground to deck) and turret copy. Barrel, fallen track links, plates and debris have no collider.')
