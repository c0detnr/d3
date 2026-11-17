import type { WaveRules } from '../core/waveRules.ts';
import { t } from '../i18n/index.ts';
import './waveHud.css';

/** Elements are created once. Updated with the existing 10 Hz HUD cadence. */
export class WaveHud {
  private readonly root = document.createElement('div');
  private readonly title = document.createElement('strong');
  private readonly detail = document.createElement('span');
  private lastTitle = '';
  private lastDetail = '';
  constructor(private readonly rules: WaveRules) {
    this.root.className = 'wave-hud';
    this.root.setAttribute('role', 'status');
    this.root.append(this.title, this.detail);
    document.getElementById('game-layer')?.append(this.root);
    if (!this.root.isConnected) document.body.append(this.root);
    this.update();
  }
  update() {
    const title = `${t('waveNumber')} ${this.rules.wave}`;
    const detail = this.rules.breakSeconds > 0
      ? `${t('waveNext')} ${Math.ceil(this.rules.breakSeconds)} ${t('waveSeconds')}`
      : `${t('waveRemaining')} ${this.rules.remaining}`;
    if (title !== this.lastTitle) this.title.textContent = this.lastTitle = title;
    if (detail !== this.lastDetail) this.detail.textContent = this.lastDetail = detail;
  }
  dispose() { this.root.remove(); }
}
