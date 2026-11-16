// Cómo se ve el próximo capítulo: calidad gráfica y duración del día. La escribe main.js (página)
// antes de cargar la run, y la lee la escena al construirse (`static get config()`), igual que la
// ciudad generada (world/generatedCity.js). Los workers no la leen: reciben la config ya armada.

/** 'high': luces y sombras · 'low': luces sin sombras · 'off': sin iluminación ni día/noche visual. */
export const GRAPHICS = ['high', 'low', 'off'];

let current = { graphics: 'high', dayMinutes: 10 };

/** @param {{ graphics?: string, dayMinutes?: number }} v */
export function setRunVisuals(v) {
  current = {
    graphics: GRAPHICS.includes(v.graphics) ? v.graphics : 'high',
    dayMinutes: v.dayMinutes > 0 ? v.dayMinutes : current.dayMinutes,
  };
}

export function getRunVisuals() {
  return current;
}
