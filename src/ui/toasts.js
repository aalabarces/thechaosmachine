// Avisos cortos que aparecen arriba al centro y se van solos (CSS: .toast).

let box = null;

export function createToasts(root) {
  box = document.createElement('div');
  box.className = 'toasts';
  root.appendChild(box);
}

export function showToast(text) {
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  el.addEventListener('animationend', () => el.remove());
  box.appendChild(el);
}
