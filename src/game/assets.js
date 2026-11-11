// URLs de assets relativas a este módulo: funcionan en la página, en los workers
// y en dist/ servido desde cualquier subcarpeta (itch.io, GitHub Pages).

const ROOT = new URL('../../assets/', import.meta.url);

/** @param {string} path relativo a assets/ */
export function asset(path) {
  return new URL(path, ROOT).href;
}

export function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}
