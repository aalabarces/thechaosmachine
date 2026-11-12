// Menú principal (GDD): continuar partida, partida nueva, salir.

import { openScreen, el, button } from './screen.js';

/**
 * @param {HTMLElement} root
 * @param {{ canContinue: boolean, chapter?: number }} options
 * @returns {Promise<'continue' | 'new' | 'quit'>}
 */
export function showMenu(root, { canContinue, chapter = 1 }) {
  return new Promise((resolve) => {
    const s = openScreen(root, 'menu');
    const done = (choice) => {
      s.close();
      resolve(choice);
    };
    s.card.append(el('div', 'screen-title big', 'THE CHAOS MACHINE'), el('div', 'screen-sub', 'Una serie sobre el caos. Vos sos el productor.'));
    const list = el('div', 'screen-buttons');
    if (canContinue) list.append(button(`CONTINUAR · CAPÍTULO ${chapter}`, () => done('continue'), 'primary'));
    list.append(button('PARTIDA NUEVA', () => done('new'), canContinue ? '' : 'primary'), button('SALIR', () => done('quit')));
    s.card.append(list);
  });
}

/**
 * Pregunta de sí o no.
 * @returns {Promise<boolean>}
 */
export function confirmScreen(root, title, text, yes = 'SÍ', no = 'NO') {
  return new Promise((resolve) => {
    const s = openScreen(root, 'confirm');
    const done = (v) => {
      s.close();
      resolve(v);
    };
    const list = el('div', 'screen-buttons row');
    list.append(button(no, () => done(false)), button(yes, () => done(true), 'danger'));
    s.card.append(el('div', 'screen-title', title), el('div', 'screen-sub', text), list);
  });
}

/** Salir: en una app (Android) cierra; en el navegador solo se puede pedir que cierren la pestaña. */
export function showQuit(root) {
  try {
    window.close();
  } catch {
    // no se puede cerrar
  }
  return new Promise((resolve) => {
    const s = openScreen(root, 'confirm');
    const list = el('div', 'screen-buttons');
    list.append(
      button('VOLVER AL MENÚ', () => {
        s.close();
        resolve();
      }),
    );
    s.card.append(el('div', 'screen-title', 'FIN DE LA EMISIÓN'), el('div', 'screen-sub', 'Ya podés cerrar la pestaña.'), list);
  });
}
