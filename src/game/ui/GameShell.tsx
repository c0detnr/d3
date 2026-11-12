import type { DevSessionConfig } from '../core/devConfig.ts';
import { WEATHER_IDS } from '../world/atmosphereSettings.ts';
import { FILM_SPOTS, type FilmSpot } from '../world/filmSetLayout.ts';
import { gameMarkup } from './gameMarkup.ts';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createGameSession } from '../../mapPreview.ts';
import { isMissionUnlocked, MISSIONS } from '../core/missions.ts';
import { useShellStore, type ShellScreen } from '../core/shellStore.ts';
import type { Language } from '../core/playerSave.ts';
import { t, type TranslationKey } from '../i18n/index.ts';
import { translateGameDom } from '../i18n/dom.ts';
import { ResultScreen, Stars } from './ResultScreen.tsx';
import './gameShell.css';

type Session = ReturnType<typeof createGameSession>;
const controlKeys: TranslationKey[] = ['driveControl', 'aimControl', 'zoomControl', 'gunnerControl', 'fireControl', 'weaponControl', 'brakeControl', 'smokeControl', 'collectControl', 'recoverControl', 'pauseControl'];
function LanguageSwitch({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return <div className="language-switch" role="group" aria-label={t('language')}>
    {(['tr', 'en'] as const).map(value => <button key={value} type="button" data-language={value} aria-pressed={language === value} aria-label={t(value === 'tr' ? 'turkish' : 'english')} onClick={() => onChange(value)}>{t(value === 'tr' ? 'trCode' : 'enCode')}</button>)}
  </div>;
}
function DeveloperPanel({ config, onChange, onStart, ready }: {
  config: DevSessionConfig; onChange: (patch: Partial<DevSessionConfig>) => void; onStart: () => void; ready: boolean;
}) {
  return <form className="settings-list developer-settings" onSubmit={event => { event.preventDefault(); onStart(); }}>
    <p className="muted">{t('devHint')}</p>
    <label>{t('devMap')}<select value={config.map} onChange={event => {
      const map = event.target.value as DevSessionConfig['map'];
      onChange({ map, mode: map !== 'kul' && config.mode === '5v5' ? 'free' : config.mode });
    }}>{(['test', 'kul', 'set'] as const).map(map => <option key={map} value={map}>{t(`devMap_${map}`)}</option>)}</select></label>
    <label>{t('devWeather')}<select value={config.weather} disabled={config.map === 'test'} aria-describedby={config.map === 'test' ? 'dev-weather-hint' : undefined} onChange={event => onChange({ weather: event.target.value as DevSessionConfig['weather'] })}>
      {WEATHER_IDS.map(weather => <option key={weather} value={weather}>{t(`devWeather_${weather}`)}</option>)}
    </select></label>
    {config.map === 'test' && <p id="dev-weather-hint" className="muted">{t('devWeatherHint')}</p>}
    <label>{t('devTank')}<select value={config.tank} onChange={event => onChange({ tank: event.target.value as DevSessionConfig['tank'] })}>{(['01', '02'] as const).map(tank => <option key={tank} value={tank}>IRON DUST {tank}</option>)}</select></label>
    <label>{t('devMode')}<select value={config.mode} onChange={event => onChange({ mode: event.target.value as DevSessionConfig['mode'] })}>
      {(['free', 'duel', '5v5'] as const).map(mode => <option key={mode} value={mode} disabled={mode === '5v5' && config.map !== 'kul'}>{t(`devMode_${mode}`)}</option>)}
    </select></label>
    {config.map === 'kul' && <label>{t('devBase')}<select value={config.base} onChange={event => onChange({ base: event.target.value as DevSessionConfig['base'] })}>{(['A', 'B'] as const).map(base => <option key={base} value={base}>{base}</option>)}</select></label>}
    {config.map === 'set' && <label>{t('devFilmSpot')}<select value={config.filmSpot} onChange={event => onChange({ filmSpot: event.target.value as FilmSpot })}>
      {(Object.keys(FILM_SPOTS) as FilmSpot[]).map(spot => <option key={spot} value={spot}>{t(`devSpot_${spot}`)}</option>)}
    </select></label>}
    <div className="shell-actions"><button type="submit" className="primary" disabled={!ready}>{t('devApply')}</button></div>
  </form>;
}
function GameShell() {
  const state = useShellStore();
  const { screen, settings, progress, navigate, updateSettings } = state;
  const session = useRef<Session | null>(null);
  const activeDev = useRef<DevSessionConfig | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = MISSIONS.find(m => m.id === state.selected) ?? MISSIONS[0];
  function createSession(attract = true, dev?: DevSessionConfig) {
    session.current?.dispose();
    activeDev.current = dev ? { ...dev } : undefined;
    setReady(false); setFailed(false);
    const status = document.querySelector<HTMLElement>('#status')!;
    status.hidden = false; status.textContent = t('loading');
    session.current = createGameSession({ shell: true, dev: activeDev.current, onReady: () => {
      setReady(true);
      const playing = useShellStore.getState().screen === 'playing';
      session.current?.setAttract(!playing && attract);
      session.current?.setPaused(!playing);
      translateGameDom();
    }, onError: () => setFailed(true), onMissionResult: score => useShellStore.getState().finishMission(score) });
    session.current.applySettings(useShellStore.getState().settings);
    if (import.meta.env.DEV) (window as unknown as { __missionTest: Session['missionTest'] }).__missionTest = session.current.missionTest;
    session.current.setAttract(attract);
  }
  useEffect(() => {
    createSession();
    const pause = () => { if (useShellStore.getState().screen === 'playing') navigate('pause'); };
    const pointer = () => { if (!document.pointerLockElement) pause(); };
    const key = (event: KeyboardEvent) => { if (event.code === 'Escape') { event.preventDefault(); const current = useShellStore.getState(); if (current.screen === 'developer') navigate(current.returnTo); else pause(); } };
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener('pointerlockchange', pointer);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', pause);
    return () => {
      session.current?.dispose();
      document.removeEventListener('pointerlockchange', pointer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', pause);
      document.body.classList.remove('game-shell', 'shell-menu', 'shell-playing');
    };
  }, []);
  useEffect(() => { session.current?.applySettings(settings); translateGameDom(); }, [settings]);
  useEffect(() => {
    document.body.classList.add('game-shell');
    document.body.classList.toggle('shell-menu', screen !== 'playing');
    document.body.classList.toggle('shell-playing', screen === 'playing');
    session.current?.setPaused(screen !== 'playing');
    if (screen !== 'playing' && document.pointerLockElement) document.exitPointerLock();
    heading.current?.focus();
  }, [screen]);
  function play(restart = false) {
    const rebuild = restart || !!activeDev.current || session.current?.missionState !== 'briefing';
    if (rebuild) createSession(false);
    session.current?.setAttract(false);
    session.current?.reset();
    session.current?.startMission();
    navigate('playing');
    session.current?.setPaused(false);
    if (ready && !rebuild) session.current?.enter();
  }
  function startDeveloper(config: DevSessionConfig) {
    createSession(false, config);
    navigate('playing');
    session.current?.setPaused(false);
  }
  function restartSession() {
    if (activeDev.current) startDeveloper(activeDev.current);
    else play(true);
  }
  function openDeveloper(returnTo: 'home' | 'pause') {
    useShellStore.setState({ returnTo, screen: 'developer' });
  }
  function resume() {
    navigate('playing'); session.current?.setPaused(false); session.current?.enter();
  }
  function missionSelect() {
    // Rebuild when leaving a match, releasing physics, audio and all listeners.
    createSession(); navigate('missions');
  }
  function openSettings(returnTo: ShellScreen) { useShellStore.setState({ returnTo, screen: 'settings' }); }
  const title = screen === 'home' ? t('campaign') : screen === 'briefing' ? t(selected.name) : screen === 'pause' ? t('paused') : screen === 'playing' || screen === 'result' ? '' : t(screen === 'missions' ? 'selectMission' : screen);
  return <>
    {screen === 'playing' ? <button className="pause-button" onClick={() => navigate('pause')} aria-label={t('paused')}>Esc · {t('paused')}</button> : <main className={`shell-layout shell-${screen}`}>
      <header className="shell-header flex items-center justify-between gap-4">
        <button className="wordmark" onClick={() => { if (state.returnTo === 'pause' && (screen === 'settings' || screen === 'developer')) navigate('pause'); else { session.current?.setAttract(true); navigate('home'); } }}>{t('title')}</button>
        <div className="shell-header-tools">{screen === 'missions' && <button className="header-back" onClick={() => navigate('home')}>← {t('back')}</button>}<LanguageSwitch language={settings.language} onChange={language => updateSettings({ language })} /></div>
      </header>
      {screen === 'result' && state.result ? <ResultScreen result={state.result} onContinue={missionSelect} onReplay={() => play(true)} onMissionSelect={missionSelect} /> : <section className="shell-panel">
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
        {screen === 'home' && <><p className="tagline">{t('tagline')}</p><nav className="main-navigation" aria-label={t('home')}><button className="primary" onClick={() => navigate('missions')}>{t('missions')}<span aria-hidden="true">→</span></button><button onClick={() => openDeveloper('home')}>{t('developer')}</button><button onClick={() => openSettings('home')}>{t('settings')}</button><button onClick={() => navigate('controls')}>{t('controls')}</button><button onClick={() => navigate('credits')}>{t('credits')}</button></nav></>}
        {screen === 'missions' && <div className="mission-workspace">
          <div className="mission-list">{MISSIONS.map((mission, index) => <button key={mission.id} className="mission-card" data-locked={!isMissionUnlocked(mission.id, progress)} aria-pressed={selected.id === mission.id} onClick={() => useShellStore.setState({ selected: mission.id })}>
            <span className="mission-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="mission-copy"><strong>{t(mission.name)}</strong><span>{t(mission.description)}</span><small>{t(mission.map)}</small></span>
            <span className="mission-state"><small className="mission-status">{!isMissionUnlocked(mission.id, progress) && <svg viewBox="0 0 16 16" role="img" aria-label={t('locked')}><rect x="3.5" y="7" width="9" height="7" rx="1"/><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7"/></svg>}{t(mission.playable ? 'available' : 'soon')}{!mission.playable && isMissionUnlocked(mission.id, progress) ? ` · ${t('unlocked')}` : ''}</small><Stars value={progress[mission.id]?.stars ?? 0} /></span>
          </button>)}</div>
          <article className="mission-detail" aria-labelledby="mission-detail-title">
            <div className="detail-heading"><h2 id="mission-detail-title">{t(selected.name)}</h2><Stars value={progress[selected.id]?.stars ?? 0} /></div>
            <p className="map-name">{t(selected.map)}</p>
            <p className="mission-summary">{t(selected.id === 'rookie' ? 'rookieSummary' : selected.description)}</p>
            <h3>{t('objectives')}</h3><ol>{selected.objectives.map(key => <li key={key}>{t(key)}</li>)}</ol>
            <h3>{t('starTargets')}</h3><ul className="star-targets">{(['starComplete', 'starTime', 'starDamage'] as const).map(key => <li key={key}><svg className="target-star" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8L2.2 9.2l6.8-1Z"/></svg><span>{t(key)}</span></li>)}</ul>
            <div className="detail-actions"><button className="primary" disabled={!selected.playable || !ready || failed} onClick={() => navigate('briefing')}>{t(selected.playable ? 'start' : 'soon')}<span aria-hidden="true">→</span></button></div>
          </article>
        </div>}
        {screen === 'briefing' && <div className="briefing-body"><div className="briefing-story"><p className="map-name">{t(selected.map)}</p><p className="story">{t(selected.story!)}</p></div><section className="briefing-objectives"><h2>{t('objectives')}</h2><ol>{selected.objectives.map(key => <li key={key}>{t(key)}</li>)}</ol></section><p className="shell-notice">{t('shellNotice')}</p><div className="shell-actions"><button className="primary" disabled={!ready || failed} onClick={() => play()}>{ready ? t('start') : t('loading')}<span aria-hidden="true">→</span></button><button onClick={() => navigate('missions')}>← {t('back')}</button></div></div>}
        {screen === 'developer' && <DeveloperPanel config={state.devConfig} ready={ready && !failed} onStart={() => startDeveloper(state.devConfig)} onChange={patch => useShellStore.setState(current => ({ devConfig: { ...current.devConfig, ...patch } }))} />}
        {screen === 'settings' && <div className="settings-list">
          <div className="settings-row"><span>{t('language')}</span><LanguageSwitch language={settings.language} onChange={language => updateSettings({ language })} /></div>
          <label>{t('sensitivity')}<span><input type="range" min=".2" max="3" step=".1" value={settings.sensitivity} onChange={e => updateSettings({ sensitivity: +e.target.value })} /><output>{settings.sensitivity.toFixed(1)}</output></span></label>
          <label>{t('invertY')}<input type="checkbox" checked={settings.invertY} onChange={e => updateSettings({ invertY: e.target.checked })} /></label>
          <label>{t('volume')}<span><input type="range" min="0" max="1" step=".05" value={settings.volume} onChange={e => updateSettings({ volume: +e.target.value })} /><output>{Math.round(settings.volume * 100)}%</output></span></label>
          <label>{t('quality')}<select value={settings.quality} onChange={e => updateSettings({ quality: e.target.value as typeof settings.quality })}>{(['low', 'medium', 'high'] as const).map(q => <option key={q} value={q}>{t(q)}</option>)}</select></label><p className="muted">{t('qualityHint')}</p><p className="muted">{t('saved')}</p>
        </div>}
        {screen === 'controls' && <ul className="control-list">{controlKeys.map(key => { const [binding, description] = t(key).split(' — '); return <li key={key}><kbd>{binding}</kbd><span>{description}</span></li>; })}</ul>}
        {screen === 'credits' && <div className="credits-copy"><p>{t('creditsIntro')}</p><ul>{(['originalCredit', 'natureCredit', 'vfxCredit', 'babylonCredit', 'fontCredit'] as const).map(key => <li key={key}>{t(key)}</li>)}<li><a href="./licenses/HAVOK.txt" target="_blank" rel="noreferrer">{t('havokCredit')}</a></li></ul></div>}
        {screen === 'pause' && <nav className="main-navigation"><button className="primary" onClick={resume}>{t('resume')}<span aria-hidden="true">→</span></button><button onClick={restartSession}>{t('restart')}</button><button onClick={() => openDeveloper('pause')}>{t('developer')}</button><button onClick={() => openSettings('pause')}>{t('settings')}</button><button onClick={missionSelect}>{t('selectMission')}</button></nav>}
        {!['home', 'pause', 'briefing', 'missions'].includes(screen) && <button className="back-button" onClick={() => navigate(screen === 'settings' || screen === 'developer' ? state.returnTo : screen === 'briefing' ? 'missions' : 'home')}>← {t('back')}</button>}
      </section>}
    </main>}
    {failed && <div className="shell-error" role="alert">{t('loadError')} <button onClick={() => createSession(screen !== 'playing', activeDev.current)}>{t('retry')}</button></div>}
    {!state.storageAvailable && <p className="storage-notice" role="status">{t('storageUnavailable')}</p>}
  </>;
}
document.getElementById('game-layer')!.innerHTML = gameMarkup();
createRoot(document.getElementById('shell-root')!).render(<GameShell />);
