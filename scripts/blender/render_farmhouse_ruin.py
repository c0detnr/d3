"""Previews: blender -b assets/environment/farmhouse_ruin_01/farmhouse_ruin_01.blend -P scripts/blender/render_farmhouse_ruin.py -- front|rear|comparison
The .blend is not saved; camera, lights, ground and the reference tank never reach the asset."""
import sys
sys.path.insert(0, '/home/mami/Projects/d3/scripts/blender')
from landmark_common import render_preview
view = sys.argv[sys.argv.index('--') + 1]
views = {'front': ((14, -18, 11), (0, 0, 1.6), 17), 'rear': ((-14, 18, 11), (0, 0, 1.6), 17), 'comparison': ((14, -26, 14), (-4, 0, 1.6), 25)}
render_preview('farmhouse_ruin_01', 'FR01', view, views, (-10.5, -1, 0))
