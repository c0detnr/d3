"""blender -b --factory-startup -P scripts/blender/validate_command_center.py  (GLB reimport in an empty scene)"""
import sys
sys.path.insert(0, '/home/mami/Projects/d3/scripts/blender')
from landmark_common import validate_glb

def extra(visible, colliders):
    names = sorted(o.name for o in colliders)
    assert [n for n in names if n.startswith(('COL_Hall', 'COL_Tier', 'COL_Plinth'))] and sum('Buttress' in n for n in names) == 2, names
    top = lambda o: max((o.matrix_world @ v.co).z for v in o.data.vertices)
    tops = {o.name: round(top(o), 3) for o in colliders}
    assert max(tops.values()) <= 11.2, tops   # colliders stop at the tier roof; the mast has none
    return {'collider_top_heights_m': tops, 'enterable': False}

validate_glb('command_center_01', 5, (14.0, 15.0), (30, 24), extra,
             'Sloped plinth, hall, command tier and two door buttresses. Closed and not enterable. Mast, dish, vents, roof units, '
             'ribs, door details, light poles and fuel tank have no collider.')
