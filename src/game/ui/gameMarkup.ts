import { t } from '../i18n/index.ts';
export function gameMarkup() { return `<canvas id="map"></canvas><div id="aim-intent" aria-hidden="true">+</div><div id="aim-bore" hidden aria-hidden="true"></div><div id="aim-status" role="status"></div><div id="combat-hud" aria-live="off"><span id="ammo-state">${t('weaponReady')}</span><progress id="reload-progress" max="1" value="1" aria-label="${t('reload')}"></progress><span id="range-readout">— m</span><span id="hit-result"></span></div><div id="status" role="status">${t('loading')}</div>
<div id="touch-controls" aria-label="${t('touchControls')}">
  <nav class="touch-tools"><button data-action="sound" aria-label="${t('soundToggle')}">${t('sound')}</button><button data-action="reset" aria-label="${t('resetTank')}">${t('recover')}</button><button data-action="weapon" aria-label="${t('switchWeapon')}">MG</button></nav>
  <div class="touch-stick drive-stick" data-stick="drive" role="group" aria-label="${t('driveStick')}"><span class="stick-guide">▲</span><i></i><b>${t('drive')}</b></div>
  <button class="touch-button brake-button" data-action="brake" aria-label="${t('brake')}">${t('brake')}</button>
  <div class="touch-stick aim-stick" data-stick="aim" role="group" aria-label="${t('aimStick')}"><span class="aim-cross">＋</span><i></i><b>${t('aim')}</b></div>
  <button class="touch-button zoom-button" data-action="zoom" aria-label="${t('holdZoom')}">⌕</button>
  <button class="touch-button fire-button" data-action="fire" aria-label="${t('fire')}"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13"/><path d="M24 3v13m0 16v13M3 24h13m16 0h13"/></svg><span>${t('fire')}</span></button>
</div><div id="rotate-hint">${t('rotate')}</div>`; }
