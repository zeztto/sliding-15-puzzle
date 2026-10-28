export const solvedTiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];

export function makePuzzle(seedText = "standalone") {
  let tiles = [...solvedTiles];
  let empty = tiles.indexOf(0);
  let previousEmpty = -1;
  const steps = 36 + (hashText(seedText) % 16);

  for (let step = 0; step < steps; step += 1) {
    const moves = movableIndexes(empty).filter((index) => index !== previousEmpty);
    const candidates = moves.length > 0 ? moves : movableIndexes(empty);
    const pick = candidates[(hashText(`${seedText}:${step}`) + step) % candidates.length];
    [tiles[empty], tiles[pick]] = [tiles[pick], tiles[empty]];
    previousEmpty = empty;
    empty = pick;
  }

  if (isSolved(tiles)) {
    const [pick] = movableIndexes(empty);
    [tiles[empty], tiles[pick]] = [tiles[pick], tiles[empty]];
  }

  return tiles;
}

export function movableIndexes(empty) {
  const out = [];
  const row = Math.floor(empty / 4);
  const col = empty % 4;
  if (row > 0) out.push(empty - 4);
  if (row < 3) out.push(empty + 4);
  if (col > 0) out.push(empty - 1);
  if (col < 3) out.push(empty + 1);
  return out;
}

export function moveTile(tiles, index) {
  const empty = tiles.indexOf(0);
  if (!movableIndexes(empty).includes(index)) return null;
  const next = [...tiles];
  [next[empty], next[index]] = [next[index], next[empty]];
  return next;
}

export function isSolved(tiles) {
  return tiles.every((tile, index) => tile === solvedTiles[index]);
}

export function isSolvable(tiles) {
  const values = tiles.filter((tile) => tile !== 0);
  let inversions = 0;
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      if (values[i] > values[j]) inversions += 1;
    }
  }

  const emptyRowFromBottom = 4 - Math.floor(tiles.indexOf(0) / 4);
  return emptyRowFromBottom % 2 === 0 ? inversions % 2 === 1 : inversions % 2 === 0;
}

export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function progressPercent(tiles) {
  const fixed = tiles.filter((tile, index) => tile !== 0 && tile === solvedTiles[index]).length;
  return Math.round((fixed / 15) * 100);
}

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
