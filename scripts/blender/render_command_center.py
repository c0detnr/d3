"""Previews: blender -b assets/environment/command_center_01/command_center_01.blend -P scripts/blender/render_command_center.py -- front|rear|comparison
The .blend is not saved; camera, lights, ground and the reference tank never reach the asset."""
import sys
sys.path.insert(0, '/home/mami/Projects/d3/scripts/blender')
from landmark_common import render_preview
view = sys.argv[sys.argv.index('--') + 1]
views = {'front': ((30, -40, 24), (0, 0, 5.5), 40), 'rear': ((-30, 40, 24), (0, 0, 5.5), 40), 'comparison': ((26, -44, 20), (-8, -4, 4), 42)}
render_preview('command_center_01', 'CC01', view, views, (-10, -19, 0))
