"""Previews: blender -b assets/environment/armored_wreck_01/armored_wreck_01.blend -P scripts/blender/render_armored_wreck.py -- front|rear|comparison
The .blend is not saved; camera, lights, ground and the reference tank never reach the asset."""
import sys
sys.path.insert(0, '/home/mami/Projects/d3/scripts/blender')
from landmark_common import render_preview
view = sys.argv[sys.argv.index('--') + 1]
views = {'front': ((13, -11, 8), (0, 0, 1.0), 10), 'rear': ((-12, 12, 8), (0, 0, 1.0), 10), 'comparison': ((10, -20, 11), (0, -3.6, 1.1), 18)}
render_preview('armored_wreck_01', 'AW01', view, views, (1.5, -7.5, 0))
