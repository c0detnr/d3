import { KUL_RAIL_DEPOT, KUL_RAIL_TRACKS, KUL_RAIL_WAGONS } from './kulRailYardLayout.ts';
import { KUL_FIELD_COVER, KUL_FIELD_RELIEF } from './kulBattlefieldLayout.ts';
import { Vector3 } from '@babylonjs/core';
import type { FollowCamera } from '../camera/FollowCamera.ts';
import { KUL_PATHS, KUL_STRUCTURES, KUL_SPAWNS } from './kulVadisiLayout.ts';
import { WEATHER_IDS, WEATHER_LABELS, weatherFromSearch } from './atmosphereSettings.ts';
import './kulVadisiControls.css';

export function addMapControls(camera: FollowCamera, active: boolean, spawnYaw: number | (() => number) = 0) {
  const panel = document.createElement('details'); panel.className = 'mission-menu';
  const summary = document.createElement('summary');
  const mapId = active ? 'kul' : new URLSearchParams(location.search).get('map') === 'set' ? 'set' : 'test';
  summary.textContent = { kul: 'KÜL VADİSİ / GÖREV', set: 'ÇEKİM SAHASI / GÖREV', test: 'TEST SAHASI / GÖREV' }[mapId];
  panel.append(summary);
  const content = document.createElement('div'); content.className = 'mission-content'; panel.append(content);
  const params = new URLSearchParams(location.search);
  const group = (title: string, key: string, options: string[][], current: string) => {
    const section = document.createElement('section');
    const heading = document.createElement('h2'); heading.textContent = title; section.append(heading);
    const links = document.createElement('nav'); links.setAttribute('aria-label', title);
    for (const [value, name] of options) {
      const link = document.createElement('a'); const url = new URL(location.href);
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      link.href = url.href; link.textContent = name;
      if (value === current) link.setAttribute('aria-current', 'true');
      links.append(link);
    }
    section.append(links); content.append(section);
  };
  group('HAREKÂT ALANI', 'map', [['test', 'Test sahası'], ['kul', 'Kül Vadisi'], ['set', 'Çekim sahası']], mapId);
  group('ARAÇ', 'tank', [['01', 'ASHFIELD 01'], ['02', 'ASHFIELD 02']], params.get('tank') === '02' ? '02' : '01');
  group('GÖREV TÜRÜ', 'duel', [['', 'Serbest sürüş'], ['1', 'Kolay düello']], params.has('duel') ? '1' : '');
  const mobile = document.createElement('section');
  const mobileHeading = document.createElement('h2'); mobileHeading.textContent = 'MOBİL'; mobile.append(mobileHeading);
  const apk = document.createElement('a'); apk.href = new URL('artifacts/iron-dust-android.apk', location.href).href;
  apk.download = 'iron-dust-android.apk'; apk.textContent = 'APK build al';
  const mobileLinks = document.createElement('nav'); mobileLinks.setAttribute('aria-label', 'MOBİL'); mobileLinks.append(apk);
  mobile.append(mobileLinks); content.append(mobile);
  const listeners = new AbortController();
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement) panel.open = false;
  }, { signal: listeners.signal });
  const fogDensity = camera.scene.fogDensity;
  const toggle = document.createElement('button'); toggle.textContent = 'Haritaya bak';
  const follow = () => { camera.follow(typeof spawnYaw === 'function' ? spawnYaw() : spawnYaw); camera.scene.fogDensity = fogDensity; toggle.textContent = 'Haritaya bak'; };
  const view = () => {
    if (camera.isOverview) follow();
    else {
      camera.overview(); camera.camera.position.set(0, 880, -280); camera.camera.setTarget(Vector3.Zero());
      camera.scene.fogDensity = 0; toggle.textContent = 'Tanka dön';
    }
  };
  toggle.addEventListener('click', view);
  const factory = document.createElement('button'); factory.textContent = 'Savaş alanına bak';
  const viewFactory = () => {
    camera.overview(); camera.camera.position.set(-100, 65, -130); camera.camera.setTarget(new Vector3(0, 0, -15));
    camera.scene.fogDensity = 0; toggle.textContent = 'Tanka dön';
  };
  factory.addEventListener('click', viewFactory);
  const railYard = document.createElement('button'); railYard.textContent = 'Tren sahasına bak';
  const viewRailYard = () => {
    camera.overview(); camera.camera.position.set(218, 76, -120); camera.camera.setTarget(new Vector3(292, -4, 0));
    camera.scene.fogDensity = 0; toggle.textContent = 'Tanka dön';
  };
  railYard.addEventListener('click', viewRailYard);
  if (mapId === 'set') {
    document.title = 'ASHFIELD · Çekim Sahası';
    group('HAVA / IŞIK', 'weather', WEATHER_IDS.map(id => [id, WEATHER_LABELS[id]]), weatherFromSearch(location.search));
  }
  if (active) {
    document.title = 'ASHFIELD · Kül Vadisi';
    group('HAVA / IŞIK', 'weather', WEATHER_IDS.map(id => [id, WEATHER_LABELS[id]]), weatherFromSearch(location.search));
    group('BAŞLANGIÇ ÜSSÜ', 'base', [['A', 'A üssü'], ['B', 'B üssü']], params.get('base') === 'B' ? 'B' : 'A');
    const views = document.createElement('nav'); views.className = 'mission-views'; views.setAttribute('aria-label', 'Kamera görünümleri');
    views.append(toggle, factory, railYard); content.append(views);
    const chart = document.createElement('details'); chart.className = 'tactical-map';
    const chartTitle = document.createElement('summary'); chartTitle.textContent = 'TAKTİK HARİTA'; chart.append(chartTitle); content.append(chart);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '-380 -380 760 760'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Kül Vadisi yol ve yapı krokisi. Kuzey üstte.');
    const node = (tag: string, attrs: Record<string, string | number>) => {
      const n = document.createElementNS(svg.namespaceURI, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); svg.append(n); return n;
    };
    node('rect', { x: -360, y: -360, width: 720, height: 720, fill: '#303b34', stroke: '#7a806c', 'stroke-width': 3 });
    for (const path of KUL_PATHS) node('polyline', { points: path.points.map(p => `${p.x},${p.z}`).join(' '), fill: 'none', stroke: path.id.startsWith('creek') ? '#718b8b' : '#bdab8b', 'stroke-width': 13 });
    for (const p of KUL_FIELD_RELIEF) node('ellipse', { cx: p.x, cy: p.z, rx: p.rx, ry: p.rz, fill: p.height > 0 ? '#93936b' : '#222e26', opacity: 0.8 });
    for (const p of KUL_FIELD_COVER) node('rect', { x: p.x - p.width / 2, y: p.z - p.depth / 2, width: p.width, height: p.depth, fill: '#d1cbb6' });
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
    for (const x of KUL_RAIL_TRACKS) node('line', { x1: x, y1: -76, x2: x, y2: 76, stroke: '#34383b', 'stroke-width': 3 });
    for (const w of KUL_RAIL_WAGONS) node('rect', { x: w.x - 2, y: w.z - 8, width: 4, height: 16, fill: '#9d6f50', transform: `rotate(${-w.yaw * 180 / Math.PI} ${w.x} ${w.z})` });
    node('rect', { x: KUL_RAIL_DEPOT.x - 7, y: KUL_RAIL_DEPOT.z - 11, width: 14, height: 22, fill: '#828575' });
    chart.append(svg);
    const legend = document.createElement('span'); legend.textContent = 'Batı: sırt · Merkez: açık savaş alanı · Doğu: tren sahası'; chart.append(legend);
    const targets = document.createElement('span'); targets.textContent = 'K komuta · Üslerde atölye ve iki açık çıkış'; chart.append(targets);
  }
  document.body.append(panel);
  return { follow, dispose() { listeners.abort(); toggle.removeEventListener('click', view); factory.removeEventListener('click', viewFactory); railYard.removeEventListener('click', viewRailYard); panel.remove(); } };
}
