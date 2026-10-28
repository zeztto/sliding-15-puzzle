import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { makePuzzle, moveTile, movableIndexes, isSolvable, isSolved, solvedTiles, formatTime } from '../src/puzzle.js';
import { BEST_KEY, createBestStore, createPuzzleGame } from '../src/controller.js';
import { mountPuzzle } from '../src/ui.js';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/completion.json', import.meta.url)));
class MemoryStorage {
  data = new Map(); writes = 0; denyRead = false; denyWrite = false;
  getItem(key) { if (this.denyRead) throw new Error('denied'); return this.data.get(key) ?? null; }
  setItem(key, value) { if (this.denyWrite) throw new Error('quota'); this.writes++; this.data.set(key, value); }
  removeItem(key) { if (this.denyWrite) throw new Error('denied'); this.data.delete(key); }
}
const make = (storage = new MemoryStorage()) => {
  let time = 0;
  const game = createPuzzleGame({ seed: fixture.seed, now: () => time, storageProvider: () => storage });
  return { storage, game, tick: n => { time += n; } };
};
function complete(run) {
  for (const index of fixture.legal_move_indexes) { run.tick(100); assert.equal(run.game.move(index), true); }
}

test('400 retained shuffles are complete permutations, solvable and unfinished', () => {
  for (let i = 0; i < 400; i++) {
    const tiles = makePuzzle(`parity-${i}`);
    assert.deepEqual([...tiles].sort((a,b) => a-b), Array.from({length:16},(_,i) => i));
    assert.equal(isSolvable(tiles), true); assert.equal(isSolved(tiles), false);
  }
});
test('legal moves are immutable and row boundaries cannot wrap', () => {
  const original = [...solvedTiles];
  assert.equal(moveTile(original, 0), null);
  assert.equal(moveTile(original, 99), null);
  assert.deepEqual(original, solvedTiles);
  assert.deepEqual(movableIndexes(4), [0,8,5]);
  assert.equal(moveTile([1,2,3,4,0,5,6,7,8,9,10,11,12,13,14,15],3), null);
});
test('undo restores the actual previous board and new game resets time/history', () => {
  const run=make(); const before=run.game.snapshot();
  run.tick(5000); assert.equal(run.game.snapshot().elapsed,0);
  run.game.move(fixture.legal_move_indexes[0]); run.tick(1200);
  assert.equal(run.game.snapshot().elapsed,1200); run.game.undo();
  assert.deepEqual(run.game.snapshot().tiles,before.tiles); assert.equal(run.game.snapshot().moves,0);
  run.game.newGame('new-game'); assert.equal(run.game.snapshot().elapsed,0); assert.equal(run.game.undo(),false);
});
test('independently solved fixture completes through 17 legal moves, stops time and persists best', () => {
  const run=make(); assert.deepEqual(run.game.snapshot().tiles,fixture.tiles); complete(run);
  const won=run.game.snapshot(); assert.equal(won.solved,true); assert.equal(won.moves,17);
  assert.equal(won.elapsed,1600); run.tick(9000); assert.equal(run.game.snapshot().elapsed,1600);
  assert.equal(run.game.undo(),false); assert.equal(run.game.move(14),false);
  assert.deepEqual(JSON.parse(run.storage.getItem(BEST_KEY)),{version:1,moves:17,elapsed:1600});
});
test('better existing best is retained, while ties compare time', () => {
  const store=new MemoryStorage(); store.setItem(BEST_KEY,JSON.stringify({version:1,moves:10,elapsed:8000}));
  const records=createBestStore(()=>store); records.save({moves:17,elapsed:100});
  assert.equal(JSON.parse(store.getItem(BEST_KEY)).moves,10);
  records.save({moves:10,elapsed:7000}); assert.equal(JSON.parse(store.getItem(BEST_KEY)).elapsed,7000);
});
for (const [label,raw] of [['invalid JSON','{broken'],['unsupported version','{"version":2,"moves":1,"elapsed":0}'],['unknown fields','{"version":1,"moves":1,"elapsed":0,"extra":true}'],['empty raw','']]) {
  test(`preserves ${label} through a full win until explicit clear`, () => {
    const storage=new MemoryStorage(); storage.setItem(BEST_KEY,raw); storage.setItem('unrelated','keep'); const writes=storage.writes;
    const run=make(storage); complete(run); assert.equal(storage.getItem(BEST_KEY),raw); assert.equal(storage.writes,writes);
    assert.ok(run.game.snapshot().storageIssue); run.game.clearBest();
    assert.equal(storage.getItem(BEST_KEY),null); assert.equal(storage.getItem('unrelated'),'keep');
  });
}
test('read denial and later read denial never write or delete source bytes', () => {
  const storage=new MemoryStorage(); storage.denyRead=true; const run=make(storage); complete(run);
  assert.equal(storage.writes,0); assert.ok(run.game.snapshot().storageIssue); assert.equal(run.game.snapshot().solved,true);
  storage.denyRead=false; storage.setItem(BEST_KEY,JSON.stringify({version:1,moves:3,elapsed:100}));
  const records=createBestStore(()=>storage); records.read(); storage.denyRead=true;
  assert.match(records.read().issue,/접근/); assert.equal(records.clear().canClear,false);
});
test('write denial keeps gameplay and session result alive', () => {
  const run=make(); run.storage.denyWrite=true; complete(run);
  assert.equal(run.game.snapshot().solved,true); assert.equal(run.game.snapshot().best.moves,17);
  assert.ok(run.game.snapshot().storageIssue); assert.equal(run.storage.writes,0);
});
test('a record corrupted after initial read is preserved on completion', () => {
  const run=make(); run.storage.setItem(BEST_KEY,'changed-bad'); const count=run.storage.writes; complete(run);
  assert.equal(run.storage.getItem(BEST_KEY),'changed-bad'); assert.equal(run.storage.writes,count);
});
test('explicit clear works after a successful save and rejects a concurrently replaced record', () => {
  const run=make(); complete(run); run.game.clearBest(); assert.equal(run.storage.getItem(BEST_KEY),null);
  const records=createBestStore(()=>run.storage); records.read(); run.storage.setItem(BEST_KEY,'other-tab');
  assert.ok(records.clear().issue); assert.equal(run.storage.getItem(BEST_KEY),'other-tab');
});
test('actual DOM click/keyboard path completes a real board and does not expose a completion global', () => {
  const dom=new JSDOM('<main id="app"></main>',{url:'https://puzzle.test'});
  const app=dom.window.document.querySelector('#app'); let time=0;
  const mounted=mountPuzzle(app,{seed:fixture.seed,now:()=>time,storageProvider:()=>dom.window.localStorage});
  const blocked=app.querySelector('[data-index]:disabled'); const original=mounted.game.snapshot().tiles;
  blocked.click(); assert.deepEqual(mounted.game.snapshot().tiles,original);
  const first=fixture.legal_move_indexes[0]; const empty=original.indexOf(0);
  const key=first===empty-4?'ArrowUp':first===empty+4?'ArrowDown':first===empty-1?'ArrowLeft':'ArrowRight';
  app.querySelector('.board').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
  for (const index of fixture.legal_move_indexes.slice(1)) { time+=100; app.querySelector(`[data-index="${index}"]`).click(); }
  assert.match(app.querySelector('#result').textContent,/완성/); assert.equal(mounted.game.snapshot().solved,true);
  assert.equal(dom.window.finishForE2E,undefined); assert.equal(dom.window.attachMockParent,undefined);
  assert.equal(app.querySelectorAll('.tile').length,16); mounted.destroy(); dom.window.close();
});
test('time formatting preserves minute rollover',()=>{assert.equal(formatTime(61_000),'01:01');});


test('focused board retains focus through two consecutive legal keyboard moves',()=>{
  const dom=new JSDOM('<main id="app"></main>',{url:'https://puzzle.test'});
  const app=dom.window.document.querySelector('#app');
  const mounted=mountPuzzle(app,{seed:fixture.seed,storageProvider:()=>dom.window.localStorage});
  try {
  app.querySelector('.board').focus();
  for(const [step,index] of fixture.legal_move_indexes.slice(0,2).entries()) {
    const empty=mounted.game.snapshot().tiles.indexOf(0);
    const key=index===empty-4?'ArrowUp':index===empty+4?'ArrowDown':index===empty-1?'ArrowLeft':'ArrowRight';
    dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
    assert.equal(mounted.game.snapshot().moves,step+1);
    assert.equal(dom.window.document.activeElement,app.querySelector('.board'));
  }
  } finally {mounted.destroy();dom.window.close();}
});


test('keyboard-activated new game and undo retain their control focus through rerenders',()=>{
 const dom=new JSDOM('<main id="app"></main>',{url:'https://puzzle.test'});const app=dom.window.document.querySelector('#app');
 const mounted=mountPuzzle(app,{seed:fixture.seed,storageProvider:()=>dom.window.localStorage});
 try {
  app.querySelector('#new-game').focus();
  for(let i=0;i<2;i++){dom.window.document.activeElement.click();assert.equal(dom.window.document.activeElement,app.querySelector('#new-game'));}
  mounted.game.newGame(fixture.seed);for(const i of fixture.legal_move_indexes.slice(0,3))mounted.game.move(i);
  app.querySelector('#undo').focus();
  for(let i=0;i<2;i++){dom.window.document.activeElement.click();assert.equal(dom.window.document.activeElement,app.querySelector('#undo'));}
  assert.equal(mounted.game.snapshot().moves,1);
 }finally{mounted.destroy();dom.window.close();}
});
test('modified or already prevented arrows do not move or cancel native behavior',()=>{
 const dom=new JSDOM('<main id="app"></main>',{url:'https://puzzle.test'});const app=dom.window.document.querySelector('#app');
 const mounted=mountPuzzle(app,{seed:fixture.seed,storageProvider:()=>dom.window.localStorage});
 try {
  const empty=mounted.game.snapshot().tiles.indexOf(0),index=fixture.legal_move_indexes[0];
  const key=index===empty-4?'ArrowUp':index===empty+4?'ArrowDown':index===empty-1?'ArrowLeft':'ArrowRight';
  for(const modifier of ['altKey','metaKey','ctrlKey','defaultPrevented']) {
   const event=new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,[modifier]:modifier!=='defaultPrevented'});
   if(modifier==='defaultPrevented')event.preventDefault();
   const before=event.defaultPrevented;app.querySelector('.board').dispatchEvent(event);
   assert.equal(mounted.game.snapshot().moves,0);assert.equal(event.defaultPrevented,before);
  }
 }finally{mounted.destroy();dom.window.close();}
});
test('entry keeps a persisted BFCache page usable and cleans up a nonpersisted unload',async()=>{
 const dom=new JSDOM('<main id="app"></main>',{url:'https://puzzle.test'});
 const originals=new Map(['window','document'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});
 Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 try {
  await import('../src/main.js?lifecycle-regression');
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide',{persisted:true}));
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow',{persisted:true}));
  assert.equal(dom.window.document.querySelectorAll('.tile').length,16);
  const button=dom.window.document.querySelector('[data-index]:not(:disabled)');button.click();
  assert.equal(dom.window.document.querySelector('#moves').textContent,'1회');
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide',{persisted:false}));
  assert.equal(dom.window.document.querySelector('#app').children.length,0);
 }finally{
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide',{persisted:false}));
  for(const [key,value] of originals){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
  dom.window.close();
 }
});
