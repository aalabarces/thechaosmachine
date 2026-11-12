// Base de las pantallas entre capítulos: una capa a pantalla completa con una tarjeta.
// Cada pantalla devuelve una promesa que se resuelve con la elección del jugador; al
// resolverse, la capa se saca del DOM.

/**
 * @param {HTMLElement} root
 * @param {string} className clase extra de la tarjeta
 * @returns {{ layer: HTMLElement, card: HTMLElement, close: () => void }}
 */
export function openScreen(root, className = '') {
  const layer = document.createElement('div');
  layer.className = 'screen';
  // El engine escucha la rueda en window (zoom) y le hace preventDefault: sin cortarla acá,
  // las pantallas no scrollean con la rueda y la cámara de fondo hace zoom.
  layer.addEventListener('wheel', (e) => e.stopPropagation());
  const card = document.createElement('div');
  card.className = `screen-card ${className}`.trim();
  layer.appendChild(card);
  root.appendChild(layer);
  return { layer, card, close: () => layer.remove() };
}

/** Crea un elemento con clase y texto (nunca HTML: los textos van como texto). */
export function el(tag, className = '', text = '') {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** Botón que, al tocarlo, llama a `onClick`. */
export function button(text, onClick, className = '') {
  const b = el('button', `screen-button ${className}`.trim(), text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** "$1.234" con separador de miles. */
export function money(n) {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}
