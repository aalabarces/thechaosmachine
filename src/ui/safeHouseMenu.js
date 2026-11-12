// Menú del bar: aparece abajo al centro cuando algún recluta está cerca de una safe house.
// Reclutar es siempre a propósito: con este botón, nunca tocando el mapa (los toques sobre el
// HTML no llegan al canvas, así que el botón no mueve al malón).

/**
 * @param {HTMLElement} root
 * @param {{ safeHouses: { prompt: { visible: boolean, price: number, affordable: boolean }, buy: () => { ok: boolean, message: string } } }} scene
 * @param {(text: string) => void} toast
 * @returns {{ destroy: () => void }}
 */
export function createSafeHouseMenu(root, scene, toast) {
  const panel = document.createElement('div');
  panel.className = 'bar-menu';
  panel.style.display = 'none';
  const title = document.createElement('div');
  title.className = 'bar-menu-title';
  title.textContent = 'BAR';
  const hint = document.createElement('div');
  hint.className = 'bar-menu-hint';
  hint.textContent = 'Invertí la plata de este capítulo en un chabón más';
  const buy = document.createElement('button');
  buy.type = 'button';
  buy.className = 'bar-menu-buy';
  buy.addEventListener('click', () => {
    const r = scene.safeHouses?.buy();
    if (r) toast(r.message);
  });
  panel.append(title, hint, buy);
  // La rueda sobre el menú no hace zoom.
  panel.addEventListener('wheel', (e) => e.stopPropagation());
  root.appendChild(panel);

  let alive = true;
  let lastText = '';
  let lastVisible = false;

  function frame() {
    if (!alive) return;
    const p = scene.safeHouses?.prompt;
    const visible = !!(p && p.visible);
    if (visible !== lastVisible) {
      lastVisible = visible;
      panel.style.display = visible ? '' : 'none';
    }
    if (visible) {
      const text = `RECLUTAR · $${p.price}`;
      if (text !== lastText) {
        lastText = text;
        buy.textContent = text;
      }
      buy.disabled = !p.affordable;
    }
    requestAnimationFrame(frame);
  }
  frame();

  return {
    destroy() {
      alive = false;
      panel.remove();
    },
  };
}
