import { isSolved, makePuzzle, moveTile } from './puzzle.js';

export const BEST_KEY = 'sliding-15-puzzle-best-v1';
const messages = {
  corrupt: '최고 기록을 읽을 수 없어 원문을 보존했습니다. 기록을 지우기 전에는 새 기록을 저장하지 않습니다.',
  denied: '브라우저 저장소에 접근할 수 없어 기록은 현재 화면에서만 유지합니다.',
  write: '최고 기록을 저장하지 못했습니다. 현재 게임은 계속할 수 있습니다.',
  changed: '다른 화면에서 기록이 바뀌었습니다. 새로고침 후 다시 확인해 주세요.',
};
const validRecord = value => value && Object.keys(value).sort().join(',') === 'elapsed,moves,version' && value.version === 1
  && Number.isSafeInteger(value.moves) && value.moves > 0 && value.moves <= 1_000_000
  && Number.isSafeInteger(value.elapsed) && value.elapsed >= 0 && value.elapsed <= 1_000_000_000_000;
const better = (next, current) => !current || next.moves < current.moves
  || (next.moves === current.moves && next.elapsed < current.elapsed);

export function createBestStore(storageProvider = () => globalThis.localStorage) {
  let knownRaw;
  function read() {
    knownRaw = undefined;
    try {
      knownRaw = storageProvider().getItem(BEST_KEY);
      if (knownRaw === null) return { best: null, issue: null, canClear: false };
      const parsed = JSON.parse(knownRaw);
      if (!validRecord(parsed)) throw new Error('shape');
      return { best: { moves: parsed.moves, elapsed: parsed.elapsed }, issue: null, canClear: true };
    } catch (error) {
      return { best: null, issue: typeof knownRaw === 'string' ? messages.corrupt : messages.denied,
        canClear: typeof knownRaw === 'string' };
    }
  }
  function save(score) {
    knownRaw = undefined;
    const current = read();
    if (current.issue) return current;
    const best = better(score, current.best) ? score : current.best;
    try {
      const payload = JSON.stringify({ version: 1, ...best });
      storageProvider().setItem(BEST_KEY, payload);
      knownRaw = payload;
      return { best, issue: null, canClear: true };
    } catch {
      return { best, issue: messages.write, canClear: current.canClear };
    }
  }
  function clear() {
    try {
      if (knownRaw === undefined) return { best: null, issue: messages.denied, canClear: false };
      if (storageProvider().getItem(BEST_KEY) !== knownRaw) return { best: null, issue: messages.changed, canClear: false };
      storageProvider().removeItem(BEST_KEY);
      knownRaw = null;
      return { best: null, issue: null, canClear: false };
    } catch {
      return { best: null, issue: messages.denied, canClear: false };
    }
  }
  return { read, save, clear };
}

export function createPuzzleGame({ seed = `${Date.now()}:${Math.random()}`, now = () => performance.now(),
  storageProvider = () => globalThis.localStorage, onChange = (_snapshot) => {} } = {}) {
  const records = createBestStore(storageProvider);
  let record = records.read();
  let tiles = makePuzzle(seed);
  let history = [];
  let moves = 0;
  let startedAt = null;
  let elapsed = 0;
  let solved = false;
  let sessionBest = record.best;
  const snapshot = () => ({ tiles: [...tiles], moves, solved, canUndo: !solved && history.length > 0,
    elapsed: solved || startedAt === null ? elapsed : Math.max(0, Math.floor(now() - startedAt)),
    best: sessionBest ? { ...sessionBest } : null, storageIssue: record.issue, canClearBest: record.canClear });
  const emit = () => onChange(snapshot());
  function move(index) {
    if (solved) return false;
    const next = moveTile(tiles, index);
    if (!next) return false;
    if (startedAt === null) startedAt = now();
    history = [[...tiles], ...history].slice(0, 20);
    tiles = next;
    moves++;
    solved = isSolved(tiles);
    if (solved) {
      elapsed = Math.max(0, Math.floor(now() - startedAt));
      const score = { moves, elapsed };
      if (better(score, sessionBest)) sessionBest = score;
      record = records.save(score);
      if (record.best && better(record.best, sessionBest)) sessionBest = record.best;
    }
    emit();
    return true;
  }
  function undo() {
    if (solved || history.length === 0) return false;
    tiles = history.shift();
    moves--;
    emit();
    return true;
  }
  function newGame(nextSeed = `${Date.now()}:${Math.random()}`) {
    tiles = makePuzzle(nextSeed);
    history = [];
    moves = 0;
    startedAt = null;
    elapsed = 0;
    solved = false;
    emit();
  }
  function clearBest() {
    record = records.clear();
    if (!record.issue) sessionBest = null;
    emit();
  }
  return { snapshot, move, undo, newGame, clearBest };
}
