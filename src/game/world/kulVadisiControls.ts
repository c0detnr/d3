import { Vector3 } from '@babylonjs/core';
import type { FollowCamera } from '../camera/FollowCamera.ts';
import { KUL_PATHS, KUL_STRUCTURES, KUL_SPAWNS } from './kulVadisiLayout.ts';
import './kulVadisiControls.css';

export function addMapControls(camera: FollowCamera, active: boolean, spawnYaw = 0) {
  const panel = document.createElement('aside'); panel.className = 'map-controls';
  const label = document.createElement('label'); label.textContent = 'HARİTA ';
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Harita seç');
  for (const [value, name] of [['test', 'Sürüş test sahası'], ['kul', 'Kül Vadisi · kaba yerleşim']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = name; select.append(option);
  }
  select.value = active ? 'kul' : 'test'; label.append(select); panel.append(label);
  const change = () => { const url = new URL(location.href); url.searchParams.set('map', select.value); location.assign(url); };
  select.addEventListener('change', change);
  const fogDensity = camera.scene.fogDensity;
  const toggle = document.createElement('button'); toggle.textContent = 'Haritaya bak';
  const follow = () => { camera.follow(spawnYaw); camera.scene.fogDensity = fogDensity; toggle.textContent = 'Haritaya bak'; };
  const view = () => {
    if (camera.isOverview) follow();
    else {
      camera.overview(); camera.camera.position.set(0, 880, -280); camera.camera.setTarget(Vector3.Zero());
      camera.scene.fogDensity = 0.00035; toggle.textContent = 'Tanka dön';
    }
  };
  toggle.addEventListener('click', view);
  const factory = document.createElement('button'); factory.textContent = 'Fabrikaya bak';
  const viewFactory = () => {
    camera.overview(); camera.camera.position.set(-110, 48, -100); camera.camera.setTarget(new Vector3(-5, 2, -15));
    camera.scene.fogDensity = 0.00035; toggle.textContent = 'Tanka dön';
  };
  factory.addEventListener('click', viewFactory);
  if (active) {
    document.title = 'IRON DUST · Kül Vadisi';
    const header = document.createElement('strong'); header.textContent = 'KÜL VADİSİ'; panel.append(header);
    const note = document.createElement('span'); note.textContent = 'Merkezde hangar ve atölye · W/A/S/D sürüş · R kurtar'; panel.append(note, toggle, factory);
    const bases = document.createElement('div');
    for (const base of ['A', 'B']) {
      const link = document.createElement('a'); const url = new URL(location.href); url.searchParams.set('base', base);
      link.href = url.href; link.textContent = `${base} üssünden başla`; bases.append(link);
    }
    panel.append(bases);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '-380 -380 760 760'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Kül Vadisi yol ve yapı krokisi. Kuzey üstte.');
    const node = (tag: string, attrs: Record<string, string | number>) => {
      const n = document.createElementNS(svg.namespaceURI, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); svg.append(n); return n;
    };
    node('rect', { x: -360, y: -360, width: 720, height: 720, fill: '#303b34', stroke: '#7a806c', 'stroke-width': 3 });
    for (const path of KUL_PATHS) node('polyline', { points: path.points.map(p => `${p.x},${p.z}`).join(' '), fill: 'none', stroke: path.id.startsWith('creek') ? '#718b8b' : '#bdab8b', 'stroke-width': 13 });
    for (const s of KUL_STRUCTURES) {
      node('rect', { x: s.x - s.width / 2, y: s.z - s.depth / 2, width: s.width, height: s.depth, fill: s.team === 'A' ? '#84aebc' : s.team === 'B' ? '#ba7959' : '#d5c7ab' });
      if (['outer', 'inner', 'command'].includes(s.kind)) {
        const text = node('text', { x: s.x, y: s.z + 6, fill: '#151d19', 'font-size': 19, 'text-anchor': 'middle', 'font-weight': 'bold' });
        text.textContent = s.kind === 'outer' ? 'D' : s.kind === 'inner' ? 'İ' : 'K';
      }
    }
    for (const [base, p] of Object.entries(KUL_SPAWNS)) {
      const text = node('text', { x: p.x + 22, y: p.z + 8, fill: '#fff', 'font-size': 26 }); text.textContent = base;
    }
    panel.append(svg);
    const legend = document.createElement('span'); legend.textContent = 'Batı: sırt · Merkez: fabrika · Doğu: ocak'; panel.append(legend);
    const targets = document.createElement('span'); targets.textContent = 'D dış savunma · İ iç savunma · K komuta'; panel.append(targets);
  }
  document.body.append(panel);
  return { follow, dispose() { select.removeEventListener('change', change); toggle.removeEventListener('click', view); factory.removeEventListener('click', viewFactory); panel.remove(); } };
}
