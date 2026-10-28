import { createPuzzleGame } from './controller.js';
import { formatTime, movableIndexes, progressPercent } from './puzzle.js';

export function mountPuzzle(app, options = {}) {
  const game = createPuzzleGame({ ...options, onChange: render });
  function render() {
    const state = game.snapshot();
    const focused = app.ownerDocument.activeElement;
    const boardFocused = focused === app.querySelector('.board');
    const focusTile = focused?.getAttribute('data-tile');
    const focusControl = ['undo','new-game','clear-best'].includes(focused?.id) ? focused.id : null;
    const movable = new Set(movableIndexes(state.tiles.indexOf(0)));
    app.innerHTML = `
      <header class="hero"><h1>15 퍼즐</h1><p>숫자를 1부터 15까지 차례로 맞추세요.</p></header>
      <dl class="meta"><div><dt>이동</dt><dd id="moves">${state.moves}회</dd></div>
        <div><dt>시간</dt><dd id="elapsed">${formatTime(state.elapsed)}</dd></div>
        <div><dt>제자리</dt><dd>${progressPercent(state.tiles)}%</dd></div></dl>
      <section class="board" tabindex="0" aria-label="15 퍼즐 보드, 화살표 방향의 타일 이동">
      ${state.tiles.map((tile, index) => tile === 0 ? '<div class="tile empty" aria-label="빈칸"></div>' :
        `<button type="button" class="tile ${movable.has(index) ? 'movable' : ''}" data-index="${index}" data-tile="${tile}"
          ${state.solved || !movable.has(index) ? 'disabled' : ''} aria-label="${tile}번 타일${movable.has(index) ? ', 이동 가능' : ''}">${tile}</button>`).join('')}
      </section>
      <div class="actions"><button type="button" id="new-game">새 퍼즐</button>
        <button type="button" id="undo" ${state.canUndo ? '' : 'disabled'}>되돌리기</button></div>
      <p id="result" role="status">${state.solved ? `완성했습니다. ${state.moves}회 · ${formatTime(state.elapsed)}` : '빈칸 옆 숫자를 누르거나 보드에서 화살표 키를 사용하세요.'}</p>
      <section class="records" aria-label="개인 최고 기록"><h2>이 브라우저의 최고 기록</h2>
        <p>${state.best ? `${state.best.moves}회 · ${formatTime(state.best.elapsed)}` : '아직 완료한 기록이 없습니다.'}</p>
        ${state.storageIssue ? `<p class="notice" role="alert">${state.storageIssue}</p>` : ''}
        ${state.canClearBest ? '<button type="button" id="clear-best">최고 기록 지우기</button>' : ''}</section>
      <p class="help">시간은 첫 이동부터 측정합니다. 되돌리기는 최근 20회까지 가능합니다. 기록은 이동 횟수, 같은 횟수에서는 시간 순으로 비교합니다.</p>`;
    app.querySelectorAll('[data-index]').forEach(button => button.addEventListener('click', () => game.move(Number(button.dataset.index))));
    app.querySelector('#new-game').addEventListener('click', () => game.newGame());
    app.querySelector('#undo').addEventListener('click', () => game.undo());
    app.querySelector('#clear-best')?.addEventListener('click', () => {
      if (app.ownerDocument.defaultView.confirm('이 브라우저의 최고 기록을 지울까요? 손상된 기록의 원문도 삭제됩니다.')) game.clearBest();
    });
    app.querySelector('.board').addEventListener('keydown', event => {
      if (event.altKey || event.metaKey || event.ctrlKey || event.defaultPrevented) return;
      const empty = game.snapshot().tiles.indexOf(0);
      const direction = { ArrowUp: empty - 4, ArrowDown: empty + 4, ArrowLeft: empty - 1, ArrowRight: empty + 1 };
      if (Object.hasOwn(direction, event.key)) {
        event.preventDefault();
        if (movableIndexes(empty).includes(direction[event.key])) game.move(direction[event.key]);
      }
    });
    if (focusTile) (app.querySelector(`[data-tile="${focusTile}"]:not(:disabled)`) ?? app.querySelector('.board')).focus();
    else if (boardFocused) app.querySelector('.board').focus();
    else if (focusControl) (app.querySelector(`#${focusControl}:not(:disabled)`) ?? app.querySelector('.board')).focus();
  }
  render();
  const timer = setInterval(() => { app.querySelector('#elapsed').textContent = formatTime(game.snapshot().elapsed); }, 250);
  return { game, destroy() { clearInterval(timer); app.replaceChildren(); } };
}
