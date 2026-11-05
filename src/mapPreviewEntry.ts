import { gameMarkup } from './game/ui/gameMarkup.ts';
import { createGameSession } from './mapPreview.ts';
document.getElementById('game-layer')!.innerHTML = gameMarkup();
const session = createGameSession();
if (import.meta.hot) import.meta.hot.dispose(() => session.dispose());
