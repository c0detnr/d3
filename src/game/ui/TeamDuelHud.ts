import { t } from '../i18n/index.ts';
import { Matrix, Vector3 } from '@babylonjs/core';
import type { TeamDuel } from '../combat/TeamDuel.ts';
import './teamDuelHud.css';

export class TeamDuelHud {
  readonly element = document.createElement('section');
  private readonly score = document.createElement('strong');
  private readonly message = document.createElement('span');
  private readonly retry = document.createElement('button');
  private readonly markers: HTMLDivElement[] = [];
  constructor(private readonly duel: TeamDuel, reset: () => void) {
    this.element.className = 'team-duel-hud'; this.element.setAttribute('aria-label', t('duelTitle'));
    this.message.setAttribute('role', 'status'); this.message.setAttribute('aria-live', 'polite');
    this.retry.textContent = t('duelRetry'); this.retry.onclick = reset;
    this.element.append(this.score, this.message, this.retry); document.body.append(this.element);
    for (const bot of duel.bots) {
      const marker = document.createElement('div'); marker.className = 'team-duel-marker';
      marker.dataset.side = bot.member.team === duel.player.team ? 'friend' : 'enemy';
      marker.setAttribute('aria-hidden', 'true'); document.body.append(marker); this.markers.push(marker);
    }
  }
  update() {
    const duel = this.duel, own = duel.alive(duel.player.team), enemy = duel.alive(duel.player.team === 'A' ? 'B' : 'A');
    this.score.textContent = `${t('friend')} ${own} / 5  ·  ${t('enemy')} ${enemy} / 5`;
    const text = duel.result === 'draw' ? t('draw') : duel.finished
      ? duel.result === duel.player.team ? t('victory').toLocaleUpperCase() : t('defeat').toLocaleUpperCase()
      : duel.player.damage.hp === 0 ? t('teamContinues') : t('duelObjective');
    if (this.message.textContent !== text) this.message.textContent = text;
    this.retry.hidden = !duel.finished;
    const camera = duel.scene.activeCamera;
    if (!camera) return;
    const viewport = camera.viewport.toGlobal(innerWidth, innerHeight);
    const direction = camera.getForwardRay().direction;
    duel.bots.forEach((bot, i) => {
      const marker = this.markers[i], member = bot.member;
      const position = member.vehicle.node.position.add(new Vector3(0, 4, 0));
      marker.hidden = member.damage.hp === 0 || Vector3.Dot(position.subtract(camera.globalPosition), direction) <= 0
        || (member.team !== duel.player.team && !duel.canSee(duel.player, member));
      if (marker.hidden) return;
      const screen = Vector3.Project(position, Matrix.Identity(), duel.scene.getTransformMatrix(), viewport);
      marker.hidden = screen.z < 0 || screen.z > 1 || screen.x < 0 || screen.x > innerWidth || screen.y < 0 || screen.y > innerHeight;
      marker.style.left = `${screen.x}px`; marker.style.top = `${screen.y}px`;
      marker.textContent = `${member.team === duel.player.team ? `◆ ${t('friend')}` : `◇ ${t('enemy')}`} · ${member.damage.hp}`;
    });
  }
  dispose() { this.retry.onclick = null; this.element.remove(); this.markers.forEach(marker => marker.remove()); }
}

export function addTeamDuelLink() {
  const link = document.createElement('a'); link.className = 'team-duel-entry';
  const url = new URL(location.href); url.searchParams.set('map', 'kul');
  if (url.searchParams.get('duel') === '5v5') {
    url.searchParams.delete('duel'); link.textContent = t('freeDrive');
  } else { url.searchParams.set('duel', '5v5'); link.textContent = t('teamDuel'); }
  link.href = url.href;
  (document.querySelector('.mission-content, .map-controls') ?? document.body).append(link);
  return () => link.remove();
}
