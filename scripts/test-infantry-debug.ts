import { createServer } from 'vite';
import { launch, waitFor } from './reel/cdp.ts';

const server = await createServer({ configFile: './vite.map.config.ts', server: { port: 5188, host: '127.0.0.1' } });
await server.listen();
const page = await launch(1280, 720, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
try {
  await page.send('Page.navigate', { url: 'http://127.0.0.1:5188/map-preview.html' });
  await waitFor(page, 'document.querySelector("#status")?.hidden && window.__missionTest', 30000, 'ready');
  const info = await page.evaluate(`(async () => {
    const res = performance.getEntriesByType('resource').find(e => e.name.includes('/@babylonjs_core.js'));
    const { EngineStore, Vector3, Matrix, Ray } = await import(res.name);
    const scene = EngineStore.LastCreatedScene;
    const camera = scene.activeCamera;
    const engine = scene.getEngine();
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const active = scene.getActiveMeshes().data;
    const infantryNodes = scene.transformNodes.filter(n => n.name.includes('infantry')).map(anchor => {
      const meshes = anchor.getChildMeshes().filter(m => m.getTotalVertices() > 0);
      const center = anchor.position.add(new Vector3(0, .9, 0));
      const screen = Vector3.Project(center, Matrix.Identity(), scene.getTransformMatrix(), viewport);
      const direction = center.subtract(camera.globalPosition);
      const blocker = scene.pickWithRay(new Ray(camera.globalPosition, direction.normalizeToNew(), direction.length()),
        m => m.isEnabled() && m.isVisible && m.getTotalVertices() > 0 && !meshes.includes(m));
      return {
        name: anchor.name,
        position: anchor.position.asArray(),
        meshesCount: meshes.length,
        enabledMeshes: meshes.filter(m => m.isEnabled() && m.isVisible).length,
        renderedMeshes: meshes.filter(m => m.isEnabled() && m.isVisible && active.includes(m)).length,
        screen: { x: screen.x, y: screen.y, z: screen.z },
        onScreen: screen.x > 0 && screen.x < viewport.width && screen.y > 0 && screen.y < viewport.height && screen.z > 0 && screen.z < 1,
        unobstructed: !blocker?.hit,
        blocker: blocker?.hit ? blocker.pickedMesh?.name : null,
      };
    });
    return {
      camera: {
        position: camera.position.asArray(),
        forward: camera.getForwardRay().direction.asArray(),
      },
      infantryNodes,
      animations: scene.animationGroups.map(g => ({ name: g.name, isPlaying: g.isPlaying })),
    };
  })()`);
  console.log('DEBUG INFO:', JSON.stringify(info, null, 2));
} finally {
  await page.close();
  await server.close();
}
