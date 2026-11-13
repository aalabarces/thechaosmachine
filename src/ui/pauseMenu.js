// Pausa (GDD: el único botón durante el juego). Botón arriba a la derecha (o Escape): congela la
// run y abre un menú con continuar, opciones y abandonar el capítulo.

import { openScreen, el, button } from './screens/screen.js';
import { buildOptions } from './screens/options.js';
import { confirmScreen } from './screens/menu.js';

/**
 * @param {HTMLElement} root
 * @param {{ dev: boolean, settings: object, WEED: any, onPause: () => void, onResume: () => void, onAbandon: () => void }} options
 * @returns {{ destroy: () => void }}
 */
export function createPauseControl(root, { dev, settings, WEED, onPause, onResume, onAbandon }) {
  const btn = el('button', dev ? 'pause-button dev' : 'pause-button', 'II');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Pausa');
  root.appendChild(btn);

  let open = false;
  let alive = true;
  /** Cierra la pausa abierta (Escape). */
  let closeCurrent = null;

  async function openPause() {
    if (open || !alive) return;
    open = true;
    onPause();
    const s = openScreen(root, 'pause');
    let resolveChoice;
    const choice = new Promise((r) => (resolveChoice = r));
    const list = el('div', 'screen-buttons');
    list.append(button('CONTINUAR', () => resolveChoice('resume'), 'primary'), button('ABANDONAR CAPÍTULO', () => resolveChoice('abandon'), 'danger'));
    s.card.append(el('div', 'screen-title', 'PAUSA'), buildOptions(settings, WEED), list);
    closeCurrent = () => resolveChoice('resume');

    let result = await choice;
    s.close();
    if (result === 'abandon') {
      const sure = await confirmScreen(root, 'ABANDONAR', 'Se termina el capítulo ahora. Te llevás la plata juntada hasta acá.', 'ABANDONAR', 'SEGUIR JUGANDO');
      if (!sure) result = 'resume';
    }
    closeCurrent = null;
    open = false;
    if (result === 'abandon') onAbandon();
    else onResume();
  }

  btn.addEventListener('click', openPause);
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    if (open) closeCurrent?.();
    else openPause();
  };
  window.addEventListener('keydown', onKey);

  return {
    destroy() {
      alive = false;
      btn.remove();
      window.removeEventListener('keydown', onKey);
    },
  };
}
