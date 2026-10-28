import { mountPuzzle } from './ui.js';

const mounted = mountPuzzle(document.querySelector('#app'));
window.addEventListener('pagehide', event => {
  if (!event.persisted) mounted.destroy();
});
