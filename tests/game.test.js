import { test, assertEquals, assertTrue, assertFalse } from './test-runner.js';
import { KlondikeGame } from '../src/game/KlondikeGame.js';
import { Leaderboard } from '../src/game/Leaderboard.js';
import { createCardRegistry } from '../src/game/DeckFactory.js';
import { canPlaceOnTableau, canPlaceOnFoundation, isValidSequence } from '../src/game/Rules.js';

const id = (suit, rank) => `${suit}-${rank}`;

/**
 * Crea un snapshot válido para pruebas con las pilas indicadas.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
function makeSnapshot(overrides = {}) {
  return {
    version: 1,
    drawCount: 1,
    passLimit: 3,
    currentPass: 1,
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    score: 0,
    moves: 0,
    status: 'playing',
    startedAt: Date.now(),
    finishedAt: null,
    ...overrides,
  };
}

/**
 * Convierte una matriz de ids en la forma del snapshot.
 *
 * @param {string[][]} columns
 * @returns {Array<Array<{id: string, faceUp: boolean}>>}
 */
function tableau(columns) {
  return columns.map((column) => column.map((cardId) => ({ id: cardId, faceUp: true })));
}

/**
 * Almacenamiento falso para probar el ranking sin localStorage.
 */
function createMemoryStorage() {
  const data = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    removeItem(key) { delete data[key]; },
  };
}

// ---------------------------------------------------------------- Reparto
test('Juego: reparto inicial correcto y 52 cartas únicas', () => {
  const game = new KlondikeGame({ seed: 42, drawCount: 1, passLimit: 3 });
  const snapshot = game.getSnapshot();
  assertEquals(snapshot.stock.length, 24);
  assertEquals(snapshot.waste.length, 0);
  assertEquals(snapshot.foundations.map((pile) => pile.length), [0, 0, 0, 0]);
  assertEquals(snapshot.tableau.map((column) => column.length), [1, 2, 3, 4, 5, 6, 7]);
  assertTrue(snapshot.tableau.every((column) => column[column.length - 1].faceUp));
  assertTrue(snapshot.tableau.every((column) => column.slice(0, -1).every((card) => !card.faceUp)));

  const ids = new Set([
    ...snapshot.stock,
    ...snapshot.waste,
    ...snapshot.foundations.flat(),
    ...snapshot.tableau.flat().map((card) => card.id),
  ]);
  assertEquals(ids.size, 52);
  assertEquals(Object.keys(createCardRegistry()).length, 52);
});

// ---------------------------------------------------------------- Robo
test('Juego: robar una carta mueve del mazo al descarte', () => {
  const game = new KlondikeGame({ seed: 1, drawCount: 1, passLimit: 3 });
  const before = game.getSnapshot();
  const result = game.drawOrRecycle();
  const after = game.getSnapshot();
  assertTrue(result.ok);
  assertEquals(after.stock.length, before.stock.length - 1);
  assertEquals(after.waste.length, 1);
  assertEquals(after.moves, 1);
  assertEquals(game.getScore(), 0);
});

test('Juego: robar tres cartas', () => {
  const game = new KlondikeGame({ seed: 1, drawCount: 3, passLimit: 3 });
  game.drawOrRecycle();
  assertEquals(game.getSnapshot().waste.length, 3);
});

test('Juego: reciclar conserva el orden de robo y avanza el pase', () => {
  const game = new KlondikeGame({ seed: 7, drawCount: 1, passLimit: 3 });
  while (game.getSnapshot().stock.length > 0) game.drawOrRecycle();
  const drawOrder = game.getSnapshot().waste;
  const result = game.drawOrRecycle();
  const after = game.getSnapshot();
  assertTrue(result.ok);
  assertEquals(after.stock, drawOrder);
  assertEquals(after.waste.length, 0);
  assertEquals(after.currentPass, 2);
});

test('Juego: no se puede reciclar si se agotaron los pases', () => {
  const game = new KlondikeGame({ seed: 7, drawCount: 1, passLimit: 1 });
  while (game.getSnapshot().stock.length > 0 && game.getStatus() === 'playing') {
    game.drawOrRecycle();
  }
  const result = game.drawOrRecycle();
  assertFalse(result.ok);
});

// ---------------------------------------------------------------- Movimientos
test('Juego: mover una carta del descarte a su fundación', () => {
  const snapshot = makeSnapshot({
    foundations: [[id('spades', 1)], [], [], []],
    waste: [id('spades', 2)],
  });
  const game = new KlondikeGame({ snapshot });
  const result = game.moveToFoundation({ type: 'waste' });
  assertTrue(result.ok);
  assertEquals(game.getSnapshot().foundations[0], [id('spades', 1), id('spades', 2)]);
  assertEquals(game.getScore(), 10);
  assertEquals(game.getMoves(), 1);
});

test('Juego: mover un grupo válido entre columnas', () => {
  const snapshot = makeSnapshot({
    tableau: tableau([
      [id('spades', 12)],
      [id('hearts', 13)],
      [],
      [],
      [],
      [],
      [],
    ]),
  });
  const game = new KlondikeGame({ snapshot });
  const result = game.moveTableauToTableau(0, id('spades', 12), 1);
  assertTrue(result.ok);
  assertEquals(game.getSnapshot().tableau[0].length, 0);
  assertEquals(game.getSnapshot().tableau[1].map((card) => card.id), [id('hearts', 13), id('spades', 12)]);
});

test('Juego: mover un grupo válido de varias cartas', () => {
  const snapshot = makeSnapshot({
    tableau: tableau([
      [id('spades', 12), id('hearts', 11), id('spades', 10)],
      [id('hearts', 13)],
      [],
      [],
      [],
      [],
      [],
    ]),
  });
  const game = new KlondikeGame({ snapshot });
  const result = game.moveTableauToTableau(0, id('spades', 12), 1);
  assertTrue(result.ok);
  assertEquals(game.getSnapshot().tableau[0].length, 0);
  assertEquals(game.getSnapshot().tableau[1].map((card) => card.id), [
    id('hearts', 13),
    id('spades', 12),
    id('hearts', 11),
    id('spades', 10),
  ]);
});

test('Juego: una secuencia rota no se puede mover como grupo', () => {
  const snapshot = makeSnapshot({
    tableau: tableau([
      [id('spades', 12), id('hearts', 9)],
      [id('hearts', 13)],
      [],
      [],
      [],
      [],
      [],
    ]),
  });
  const game = new KlondikeGame({ snapshot });
  assertFalse(game.canMoveTableauToTableau(0, id('spades', 12), 1));
  assertFalse(game.moveTableauToTableau(0, id('spades', 12), 1).ok);
});

test('Juego: una columna vacía solo acepta un Rey', () => {
  const queenSnapshot = makeSnapshot({
    tableau: tableau([[id('hearts', 12)], [], [], [], [], [], []]),
  });
  const queenGame = new KlondikeGame({ snapshot: queenSnapshot });
  assertFalse(queenGame.moveTableauToTableau(0, id('hearts', 12), 1).ok);

  const kingSnapshot = makeSnapshot({
    tableau: tableau([[id('hearts', 13)], [], [], [], [], [], []]),
  });
  const kingGame = new KlondikeGame({ snapshot: kingSnapshot });
  assertTrue(kingGame.moveTableauToTableau(0, id('hearts', 13), 1).ok);
});

// ---------------------------------------------------------------- Deshacer
test('Juego: deshacer y rehacer un robo', () => {
  const game = new KlondikeGame({ seed: 3, drawCount: 1, passLimit: 3 });
  const before = game.getSnapshot();
  game.drawOrRecycle();
  assertTrue(game.canUndo());
  assertTrue(game.undo());
  const undone = game.getSnapshot();
  assertEquals(undone.stock, before.stock);
  assertEquals(undone.waste, before.waste);
  assertEquals(undone.moves, before.moves);
  assertTrue(game.redo());
  assertEquals(game.getSnapshot().waste.length, 1);
});

// ---------------------------------------------------------------- Fin de partida
test('Juego: autocompletar mueve los reyes y termina la partida', () => {
  const foundation = (suit, count) => Array.from(
    { length: count },
    (_, index) => id(suit, index + 1),
  );
  const snapshot = makeSnapshot({
    foundations: [
      foundation('spades', 12),
      foundation('hearts', 12),
      foundation('diamonds', 12),
      foundation('clubs', 12),
    ],
    tableau: tableau([
      [id('spades', 13)],
      [id('hearts', 13)],
      [id('diamonds', 13)],
      [id('clubs', 13)],
      [],
      [],
      [],
    ]),
  });
  const game = new KlondikeGame({ snapshot });
  let steps = 0;
  while (game.getStatus() === 'playing' && steps < 10) {
    assertTrue(game.autoCompleteStep());
    steps += 1;
  }
  assertEquals(steps, 4);
  assertEquals(game.getStatus(), 'won');
  assertEquals(game.getScore(), 140);
});

test('Juego: victoria al completar las cuatro fundaciones', () => {
  const foundations = [
    Array.from({ length: 12 }, (_, index) => id('spades', index + 1)),
    Array.from({ length: 13 }, (_, index) => id('hearts', index + 1)),
    Array.from({ length: 13 }, (_, index) => id('diamonds', index + 1)),
    Array.from({ length: 13 }, (_, index) => id('clubs', index + 1)),
  ];
  const snapshot = makeSnapshot({
    foundations,
    waste: [id('spades', 13)],
  });
  const game = new KlondikeGame({ snapshot });
  const result = game.moveToFoundation({ type: 'waste' });
  assertTrue(result.ok);
  assertEquals(game.getStatus(), 'won');
  assertEquals(game.getScore(), 110);
});

test('Juego: derrota cuando no hay movimientos ni pases', () => {
  const snapshot = makeSnapshot({
    passLimit: 1,
    currentPass: 1,
    tableau: tableau([
      [id('spades', 2)],
      [id('spades', 3)],
      [id('spades', 4)],
      [id('spades', 5)],
      [id('spades', 6)],
      [id('spades', 7)],
      [id('spades', 8)],
    ]),
  });
  const game = new KlondikeGame({ snapshot });
  const result = game.drawOrRecycle();
  assertFalse(result.ok);
  assertEquals(game.getStatus(), 'lost');
});

// ---------------------------------------------------------------- Reglas
test('Reglas: columnas, fundaciones y secuencias', () => {
  const king = { value: 13, color: 'red', faceUp: true };
  const queen = { value: 12, color: 'black', faceUp: true };
  const queenSameColor = { value: 12, color: 'red', faceUp: true };
  assertTrue(canPlaceOnTableau(king, null));
  assertFalse(canPlaceOnTableau(queen, null));
  assertTrue(canPlaceOnTableau(queen, king));
  assertFalse(canPlaceOnTableau(queenSameColor, king));
  assertTrue(canPlaceOnFoundation({ value: 1, suit: { id: 'spades' } }, null));
  assertTrue(canPlaceOnFoundation(
    { value: 2, suit: { id: 'spades' } },
    { value: 1, suit: { id: 'spades' } },
  ));
  assertFalse(canPlaceOnFoundation(
    { value: 2, suit: { id: 'hearts' } },
    { value: 1, suit: { id: 'spades' } },
  ));
  assertTrue(isValidSequence([
    { value: 13, color: 'red', faceUp: true },
    { value: 12, color: 'black', faceUp: true },
    { value: 11, color: 'red', faceUp: true },
  ]));
  assertFalse(isValidSequence([
    { value: 13, color: 'red', faceUp: true },
    { value: 12, color: 'red', faceUp: true },
  ]));
});

// ---------------------------------------------------------------- Ranking
test('Ranking: insertar, ordenar, buscar, eliminar y podar', () => {
  const storage = createMemoryStorage();
  const board = new Leaderboard({ storage, key: 'test-scores', maxEntries: 3 });
  board.add({ score: 10, name: 'Ana', mode: 'clásico', time: 10, moves: 5 });
  board.add({ score: 30, name: 'Beto', mode: 'clásico', time: 20, moves: 6 });
  board.add({ score: 20, name: 'Carla', mode: 'difícil', time: 30, moves: 7 });
  board.add({ score: 5, name: 'Dani', mode: 'clásico', time: 40, moves: 8 });

  assertEquals(board.top(3).map((entry) => entry.score), [30, 20, 10]);
  assertEquals(board.search(20).name, 'Carla');
  assertEquals(board.search(5), null);
  board.add({ score: 40, name: 'Eva', mode: 'clásico', time: 50, moves: 9 });
  assertEquals(board.top(3).map((entry) => entry.score), [40, 30, 20]);
  assertTrue(board.remove(20));
  assertEquals(board.search(20), null);
  assertEquals(board.top(3).map((entry) => entry.score), [40, 30]);
  assertEquals(board.getDebugInfo().size, 2);
});

test('Ranking: qualifies respeta el límite del top', () => {
  const storage = createMemoryStorage();
  const board = new Leaderboard({ storage, key: 'test-qualify', maxEntries: 2 });
  assertTrue(board.qualifies(1));
  board.add({ score: 10, name: 'Ana' });
  board.add({ score: 20, name: 'Beto' });
  assertFalse(board.qualifies(5));
  assertTrue(board.qualifies(15));
  assertTrue(board.qualifies(20));
});

// ---------------------------------------------------------------- Pistas y fin de partida
test('Juego: pistas para fundación, robo, reciclaje y sin movimientos', () => {
  const foundationGame = new KlondikeGame({
    snapshot: makeSnapshot({ waste: [id('spades', 1)] }),
  });
  const foundationHint = foundationGame.getHint();
  assertEquals(foundationHint.type, 'foundation');
  assertEquals(foundationHint.cardId, id('spades', 1));
  assertEquals(foundationHint.foundationIndex, 0);

  const drawGame = new KlondikeGame({
    snapshot: makeSnapshot({ stock: [id('hearts', 5)] }),
  });
  assertEquals(drawGame.getHint().type, 'draw');

  const recycleGame = new KlondikeGame({
    snapshot: makeSnapshot({ waste: [id('hearts', 5)] }),
  });
  assertEquals(recycleGame.getHint().type, 'recycle');

  const noneGame = new KlondikeGame({ snapshot: makeSnapshot() });
  assertEquals(noneGame.getHint().type, 'none');
});

test('Juego: mover una carta de la fundación al tablero descuenta puntos', () => {
  const snapshot = makeSnapshot({
    foundations: [[id('spades', 1)], [], [], []],
    tableau: tableau([[id('hearts', 2)], [], [], [], [], [], []]),
    score: 20,
  });
  const game = new KlondikeGame({ snapshot });
  const result = game.moveFoundationToTableau(0, 0);
  assertTrue(result.ok);
  assertEquals(game.getSnapshot().foundations[0].length, 0);
  assertEquals(game.getSnapshot().tableau[0].map((card) => card.id), [
    id('hearts', 2),
    id('spades', 1),
  ]);
  assertEquals(game.getScore(), 5);
});

test('Juego: rendirse marca derrota y se puede deshacer', () => {
  const game = new KlondikeGame({ seed: 5, drawCount: 1, passLimit: 3 });
  assertTrue(game.surrender());
  assertEquals(game.getStatus(), 'lost');
  assertTrue(game.canUndo());
  assertTrue(game.undo());
  assertEquals(game.getStatus(), 'playing');
});

test('Juego: los pases ilimitados no se agotan', () => {
  const game = new KlondikeGame({ seed: 9, drawCount: 1, passLimit: 'infinite' });
  for (let cycle = 0; cycle < 2; cycle += 1) {
    while (game.getSnapshot().stock.length > 0) game.drawOrRecycle();
    assertTrue(game.drawOrRecycle().ok);
  }
  assertEquals(game.getSnapshot().currentPass, 3);
  assertTrue(game.drawOrRecycle().ok);
  assertEquals(game.getSnapshot().waste.length, 1);
});

test('Juego: un snapshot inválido no se carga', () => {
  const game = new KlondikeGame({ seed: 11, drawCount: 1, passLimit: 3 });
  const before = game.getSnapshot();
  assertFalse(game.loadSnapshot(null));
  assertFalse(game.loadSnapshot({ stock: [] }));
  assertEquals(game.getSnapshot().stock, before.stock);
  assertEquals(game.getSnapshot().tableau, before.tableau);
});
