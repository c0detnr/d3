import { t } from '../i18n/index.ts';
import type { MissionResult } from '../core/shellStore.ts';
export interface ResultScreenProps { result: MissionResult; onContinue: () => void; onReplay: () => void; onMissionSelect: () => void }
export function Stars({ value }: { value: number }) {
  return <span className="stars" aria-label={`${t('stars')}: ${value} / 3`}>{[1, 2, 3].map(i => <svg key={i} className={i <= value ? 'earned' : ''} viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8L2.2 9.2l6.8-1Z" /></svg>)}</span>;
}
export function ResultScreen({ result, onContinue, onReplay, onMissionSelect }: ResultScreenProps) {
  const seconds = Math.floor(result.seconds);
  return <section className="shell-panel result-panel"><div className="result-summary"><h1>{t(result.victory ? 'victory' : 'defeat')}</h1><Stars value={result.stars} /><p>{t(result.victory ? 'radioVictory' : 'radioDefeat')}</p></div><dl className="result-stats"><div><dt>{t('duration')}</dt><dd>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</dd></div><div><dt>{t('accuracy')}</dt><dd>{result.shots ? Math.min(100, Math.round(result.hits / result.shots * 100)) : 0}%</dd></div><div><dt>{t('missionDamageTaken')}</dt><dd>{result.damageTaken ?? 0}</dd></div></dl><div className="shell-actions">{result.victory && <button className="primary" onClick={onContinue}>{t('continue')}</button>}<button onClick={onReplay}>{t('replay')}</button><button onClick={onMissionSelect}>{t('selectMission')}</button></div></section>;
}

export function TeamResultScreen({ result, onReplay, onHome }: {
  result: { outcome: 'A' | 'B' | 'draw'; score: { A: number; B: number }; kills: number; deaths: number; seconds: number };
  onReplay: () => void; onHome: () => void;
}) {
  return <section className="shell-panel result-panel"><div className="result-summary"><p>{t('teamClash')}</p><h1>{t(result.outcome === 'draw' ? 'draw' : result.outcome === 'A' ? 'victory' : 'defeat')}</h1><p className="team-result-score">A {result.score.A} — {result.score.B} B</p></div><dl className="result-stats"><div><dt>{t('teamKills')}</dt><dd>{result.kills}</dd></div><div><dt>{t('teamDeaths')}</dt><dd>{result.deaths}</dd></div><div><dt>{t('duration')}</dt><dd>{Math.floor(result.seconds / 60)}:{String(Math.floor(result.seconds % 60)).padStart(2, '0')}</dd></div></dl><div className="shell-actions"><button className="primary" onClick={onReplay}>{t('teamReplay')}</button><button onClick={onHome}>{t('home')}</button></div></section>;
}
