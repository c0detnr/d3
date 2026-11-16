/**
 * ASHFIELD HUD icon set: original 24×24 line icons, one stroke weight (currentColor),
 * square caps and mitred joins to match the stencil / chamfered brand language.
 */
const PATHS = {
  hull: 'M12 3 20 6v6c0 4.5-3.6 7.6-8 9-4.4-1.4-8-4.5-8-9V6Z M9 12h6 M12 9v6',
  engine: 'M4 9h3l2-2h5l2 2h2v3h2v-2h1v6h-1v-2h-2v3h-3l-2 2H9l-2-2H4Z',
  leftTrack: 'M3 8h12a4 4 0 0 1 0 8H3Z M6 8v8 M9 8v8 M12 8v8 M19 7v10',
  rightTrack: 'M21 8H9a4 4 0 0 0 0 8h12Z M18 8v8 M15 8v8 M12 8v8 M5 7v10',
  turret: 'M5 16h14l-2-6H8Z M12 10V8h9 M3 19h18',
  fire: 'M12 21c-4 0-6-2.6-6-6 0-3 2-5 3-8 1.5 1.5 2 3 2 4 1-1 2-3 2-6 3 2.5 5 6 5 10 0 3.4-2 6-6 6Z M12 21c-1.6 0-2.5-1-2.5-2.5S11 16 12 14c1 2 2.5 3 2.5 4.5S13.6 21 12 21Z',
  repair: 'M14.5 4.5a4 4 0 0 0-4.8 5.3L4 15.5 8.5 20l5.7-5.7a4 4 0 0 0 5.3-4.8l-2.6 2.6-2.8-.7-.7-2.8Z',
  shell: 'M3 10h11l3-1 4 3-4 3-3-1H3Z M6 10v4 M14 10v4',
  mg: 'M2 11h14v3H2Z M16 12h6 M6 14l-1 4h3l1-4 M10 11V8h3v3',
  smoke: 'M7 21h4V10H7Z M13 21h4V10h-4Z M7 13h4 M13 13h4 M8 10V8h2v2 M14 10V8h2v2 M6 6c1-2 3-2 4-1 1-2 4-2 5 0 1.5-1 3 0 3 1.5',
  drone: 'M9 10h6v4H9Z M9 10 5 6 M15 10l4-4 M9 14l-4 4 M15 14l4 4 M2 6h6 M16 6h6 M2 18h6 M16 18h6',
  speed: 'M4 17a8 8 0 1 1 16 0 M12 17l4-5 M4 17h2 M18 17h2 M12 9V7',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 3',
  destroyed: 'M5 5l14 14 M19 5 5 19 M12 3v3 M12 18v3 M3 12h3 M18 12h3',
  hit: 'M12 3v5 M12 16v5 M3 12h5 M16 12h5 M8 8l-2-2 M16 8l2-2 M8 16l-2 2 M16 16l2 2',
  blocked: 'M12 3 20 6v6c0 4.5-3.6 7.6-8 9-4.4-1.4-8-4.5-8-9V6Z M5 19 19 5',
  respawn: 'M4 12a8 8 0 0 1 14-5.3L20 9 M20 4v5h-5 M20 12a8 8 0 0 1-14 5.3L4 15 M4 20v-5h5',
  shield: 'M12 3 20 6v6c0 4.5-3.6 7.6-8 9-4.4-1.4-8-4.5-8-9V6Z M8.5 12l2.5 2.5 4.5-5',
  pause: 'M7 5h3v14H7Z M14 5h3v14h-3Z',
  mouse: 'M7 9a5 5 0 0 1 10 0v6a5 5 0 0 1-10 0Z M12 4v5 M7 9h10',
  signal: 'M4 20v-3 M9 20v-7 M14 20V9 M19 20V4',
  signalOff: 'M4 20v-3 M9 20v-7 M14 20V9 M19 20V4 M3 4l18 16',
  jam: 'M12 13a1 1 0 1 0 0-2 M8 8a5.6 5.6 0 0 0 0 8 M16 8a5.6 5.6 0 0 1 0 8 M5 5a9.9 9.9 0 0 0 0 14 M19 5a9.9 9.9 0 0 1 0 14 M3 21 21 3',
  battery: 'M3 8h15v8H3Z M18 10h3v4h-3 M6 11v2 M9 11v2 M12 11v2',
  altitude: 'M12 3v14 M8 7l4-4 4 4 M3 21h18 M6 21l3-4 M18 21l-3-4',
  home: 'M3 15h18l-2-4H6Z M8 11V9h8v2 M12 9V6h7 M4 18h16',
  throttle: 'M12 21V9 M8 13l4-4 4 4 M5 4h14',
  zoom: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z M15.5 15.5 21 21 M8 10.5h5 M10.5 8v5',
  ready: 'M4 12.5 9.5 18 20 6',
  range: 'M3 12h18 M3 8v8 M21 8v8 M7 12l-3-2v4Z M17 12l3-2v4Z',
  day: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  thermal: 'M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Z M12 10v7 M17 6h3 M17 10h3',
  laser: 'M3 12h4 M10 12h11 M18 9l3 3-3 3 M7 9v6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  friend: 'M12 4l8 8-8 8-8-8Z',
  enemy: 'M5 5h14v14H5Z M5 5l14 14 M19 5 5 19',
  kill: 'M5 12h10 M12 8l4 4-4 4 M19 6v12',
  forward: 'M12 4l7 9h-4v7H9v-7H5Z',
  neutral: 'M7 7h10v10H7Z',
  reverse: 'M12 20l7-9h-4V4H9v7H5Z',
  heading: 'M12 3l6 17-6-4-6 4Z',
} as const;

export type IconName = keyof typeof PATHS;

/** Inline SVG markup. A label makes the icon an accessible image; otherwise it is decorative. */
export function icon(name: IconName, label?: string, className = '') {
  const a11y = label ? `role="img" aria-label="${escapeAttr(label)}"` : 'aria-hidden="true"';
  return `<svg class="hud-icon${className ? ` ${className}` : ''}" data-icon="${name}" viewBox="0 0 24 24" ${a11y}><path d="${PATHS[name]}"/></svg>`;
}

/** Small key badge, e.g. [F]. */
export function keyBadge(key: string) { return `<kbd class="hud-key">${escapeAttr(key)}</kbd>`; }

/** Visually hidden text for screen readers next to icon-only content. */
export function srText(text: string) { return `<span class="sr-only">${escapeAttr(text)}</span>`; }

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
