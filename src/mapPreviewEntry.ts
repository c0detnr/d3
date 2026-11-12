import { gameMarkup } from './game/ui/gameMarkup.ts';
import { createGameSession } from './mapPreview.ts';
import { LoadingScreen } from './game/ui/LoadingScreen.ts';

document.getElementById('game-layer')!.innerHTML = gameMarkup();
const loading = new LoadingScreen();
const session = createGameSession();
if (import.meta.env.DEV) (window as unknown as { __missionTest: typeof session.missionTest }).__missionTest = session.missionTest;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    loading.dispose();
    session.dispose();
  });
}
