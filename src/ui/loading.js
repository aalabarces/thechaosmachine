// Pantalla negra de carga mientras el engine baja assets y levanta los workers.

let el = null;

export function showLoading(root) {
  if (el) return;
  el = document.createElement('div');
  el.className = 'loading';
  el.textContent = 'CARGANDO EL CAOS…';
  root.appendChild(el);
}

export function hideLoading() {
  if (!el) return;
  el.remove();
  el = null;
}
