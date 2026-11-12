// Aviso flotante sobre el bar cuando hay reclutas cerca: "BAR · $120 · tocá para reclutar".
// Sigue al bar en pantalla (Camera.worldToScreen) y se pone gris si no alcanza la plata.

/** Px de mundo por encima del cartel donde va el aviso. */
const ABOVE = 40;

/**
 * @param {HTMLElement} root
 * @param {{ safeHouses: { prompt: { visible: boolean, x: number, y: number, price: number, affordable: boolean } } }} scene
 * @param {any} Camera WEED.Camera
 * @returns {{ destroy: () => void }}
 */
export function createSafeHousePrompt(root, scene, Camera) {
  const el = document.createElement('div');
  el.className = 'safehouse-prompt';
  el.style.display = 'none';
  root.appendChild(el);
  const canvas = document.querySelector('canvas');
  const out = { x: 0, y: 0 };
  let alive = true;
  let lastText = '';

  function frame() {
    if (!alive) return;
    const p = scene.safeHouses?.prompt;
    if (!p || !p.visible || !canvas) {
      el.style.display = 'none';
    } else {
      Camera.worldToScreen(p.x, p.y - ABOVE, out);
      // worldToScreen da px del canvas de la cámara; en pantalla puede estar escalado (devicePixelRatio).
      // El canvas se transfiere al worker de render, así que su tamaño se lee de la cámara.
      const rect = canvas.getBoundingClientRect();
      const sx = rect.width / (Camera.canvasWidth || rect.width);
      const sy = rect.height / (Camera.canvasHeight || rect.height);
      el.style.display = '';
      el.style.left = `${rect.left + out.x * sx}px`;
      el.style.top = `${rect.top + out.y * sy}px`;
      const text = `BAR · $${p.price} · tocá para reclutar`;
      if (text !== lastText) {
        lastText = text;
        el.textContent = text;
      }
      el.classList.toggle('poor', !p.affordable);
    }
    requestAnimationFrame(frame);
  }
  frame();

  return {
    destroy() {
      alive = false;
      el.remove();
    },
  };
}
