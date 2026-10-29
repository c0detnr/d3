"""blender -b --factory-startup -P scripts/blender/validate_farmhouse_ruin.py  (GLB reimport in an empty scene)"""
import sys
sys.path.insert(0, '/home/mami/Projects/d3/scripts/blender')
from mathutils import Vector
from landmark_common import validate_glb

def extra(visible, colliders):
    names = [o.name for o in colliders]
    assert any(n.startswith('COL_InteriorFill') for n in names) and any(n.startswith('COL_InteriorRubble') for n in names), names
    top = lambda o: max((o.matrix_world @ v.co).z for v in o.data.vertices)
    heights = sorted(top(o) for o in colliders if 'Wall' in o.name)
    chimney = max(top(o) for o in colliders if 'Chimney' in o.name)
    assert heights[0] >= 1.2 - 1e-2 and 3.9 <= heights[-1] <= 4.1 and chimney > 5.5, heights   # low cover .. 4 m walls, chimney
    return {'wall_collider_top_heights_m': [round(h, 3) for h in heights], 'chimney_collider_top_m': round(chimney, 3), 'interior_blocked': True}

validate_glb('farmhouse_ruin_01', 20, (5.5, 6.5), (12, 9), extra,
             'Footing, 12 broken wall pieces, chimney base/stack, interior fill box, interior/corner/door rubble mounds. '
             'Wall colliders copy the visible jagged silhouette; window/door gaps are 1.2 m (no tank entry). Beams, tiles, quoins and loose blocks have no collider.')
