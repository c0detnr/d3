import { t } from '../i18n/index.ts';
import { Matrix, Vector3 } from '@babylonjs/core';
import type { TeamDuel } from '../combat/TeamDuel.ts';
import './hudTokens.css';
import './teamDuelHud.css';

export class TeamDuelHud {
  readonly element = document.createElement('section');
  private readonly score = document.createElement('strong');
  private readonly message = document.createElement('span');
  private readonly timer = document.createElement('span');
  private readonly feed = document.createElement('ol');
  private readonly retry = document.createElement('button');
  private readonly markers: HTMLDivElement[] = [];
  constructor(private readonly duel: TeamDuel, reset: () => void) {
    this.element.className = 'team-duel-hud'; this.element.setAttribute('aria-label', t(duel.rules ? 'teamClash' : 'duelTitle'));
    this.score.innerHTML = '<span data-side="friend"></span> · <span data-side="enemy"></span>';
    this.message.setAttribute('role', 'status'); this.message.setAttribute('aria-live', 'polite');
    this.retry.textContent = t('duelRetry'); this.retry.onclick = reset;
    this.timer.className = 'team-duel-clock'; this.feed.className = 'team-duel-feed';
    this.element.append(this.score, this.timer, this.message, this.retry); this.element.append(this.feed); document.body.append(this.element);
    for (const bot of duel.bots) {
      const marker = document.createElement('div'); marker.className = 'team-duel-marker';
      marker.dataset.side = bot.member.team === duel.player.team ? 'friend' : 'enemy';
      marker.setAttribute('aria-hidden', 'true'); document.body.append(marker); this.markers.push(marker);
    }
  }
  update() {
    const duel = this.duel, own = duel.alive(duel.player.team), enemy = duel.alive(duel.player.team === 'A' ? 'B' : 'A');
    const rules = duel.rules;
    this.score.querySelector('[data-side="friend"]')!.textContent = rules ? `A  ${rules.score.A}` : `${t('friend')} ${own} / ${duel.layout.teamSize}`;
    this.score.querySelector('[data-side="enemy"]')!.textContent = rules ? `${rules.score.B}  B` : `${t('enemy')} ${enemy} / ${duel.layout.teamSize}`;
    this.timer.textContent = rules ? `${Math.floor(Math.ceil(rules.remaining) / 60)}:${String(Math.ceil(rules.remaining) % 60).padStart(2, '0')} · ${t('teamGoal')}` : '';
    const player = rules?.members[0];
    const text = duel.result === 'draw' ? t('draw') : duel.finished
      ? duel.result === duel.player.team ? t('victory').toLocaleUpperCase() : t('defeat').toLocaleUpperCase()
      : duel.player.damage.hp === 0 ? player ? `${t('teamRespawn')} · ${Math.ceil(player.respawn)} s` : t('teamContinues') : player && player.protection > 0 ? `${t('teamProtection')} · ${Math.ceil(player.protection)} s` : rules ? t('teamClash') : t('duelObjective');
    if (this.message.textContent !== text) this.message.textContent = text;
    this.retry.hidden = !duel.finished || !!rules;
    const entries = duel.feed.filter(entry => rules && rules.elapsed - entry.time < 8);
    const feedText = entries.map(entry => `${entry.killer} → ${entry.victim}`).join('|');
    if (this.feed.dataset.entries !== feedText) {
      this.feed.dataset.entries = feedText;
      this.feed.replaceChildren(...entries.map(entry => {
        const row = document.createElement('li'); row.textContent = `${entry.killer} → ${entry.victim}`;
        row.dataset.side = entry.team === duel.player.team ? 'friend' : 'enemy'; return row;
      }));
    }
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
