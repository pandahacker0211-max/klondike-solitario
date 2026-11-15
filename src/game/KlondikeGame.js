import { Queue } from '../structures/Queue.js';
import { Stack } from '../structures/Stack.js';
import { DoublyLinkedList } from '../structures/DoublyLinkedList.js';
import { CircularList } from '../structures/CircularList.js';
import { createShuffledDeck, createCardRegistry } from './DeckFactory.js';
import {
  FOUNDATION_SUITS,
  getFoundationIndex,
  canPlaceOnTableau,
  canPlaceOnFoundation,
} from './Rules.js';
import { SCORE_VALUES, applyScore } from './Scoring.js';
import { SNAPSHOT_VERSION, cloneSnapshot, isSnapshotLike } from './Snapshot.js';
import { makeRng, randomSeed } from '../utils/rng.js';

const TABLEAU_COLUMNS = 7;
const FOUNDATION_COUNT = 4;

/**
 * Lógica completa del Solitario Klondike.
 *
 * El estado del juego vive en estructuras propias:
 * - `Queue` para el mazo de robo.
 * - `Stack` para el descarte, las fundaciones y el historial de deshacer.
 * - `DoublyLinkedList` para las 7 columnas.
 * - `CircularList` para los pases del mazo.
 *
 * La clase no depende del DOM: la interfaz consume snapshots y llama acciones.
 */
export class KlondikeGame {
  /**
   * @param {{drawCount?: number, passLimit?: number|'infinite', seed?: number, snapshot?: object}} [options]
   */
  constructor(options = {}) {
    this._drawCount = options.drawCount === 3 ? 3 : 1;
    this._passLimit = this.#normalizePassLimit(options.passLimit ?? 3);
    this._seed = options.seed;
    this._rng = makeRng(this._seed);
    this._registry = {};

    this._stock = new Queue();
    this._waste = new Stack();
    this._foundations = [];
    for (let i = 0; i < FOUNDATION_COUNT; i += 1) {
      this._foundations.push(new Stack());
    }
    this._tableau = [];
    for (let i = 0; i < TABLEAU_COLUMNS; i += 1) {
      this._tableau.push(new DoublyLinkedList());
    }
    this._passes = new CircularList();
    this._undoStack = new Stack();
    this._redoStack = new Stack();

    this._score = 0;
    this._moves = 0;
    this._status = 'playing';
    this._startedAt = Date.now();
    this._finishedAt = null;
    this._currentPass = 1;

    if (options.snapshot) {
      this.loadSnapshot(options.snapshot, { resetHistory: true });
    } else {
      this.newGame({
        drawCount: this._drawCount,
        passLimit: this._passLimit,
        seed: this._seed,
      });
    }
  }

  /**
   * Crea una partida nueva y reparte las cartas.
   *
   * @param {{drawCount?: number, passLimit?: number|'infinite', seed?: number}} [options]
   * @returns {void}
   * @complexity O(n²) por el barajado; n = 52.
   */
  newGame(options = {}) {
    this._drawCount = options.drawCount === 3 ? 3 : 1;
    this._passLimit = this.#normalizePassLimit(options.passLimit ?? 3);
    this._seed = options.seed === undefined ? randomSeed() : options.seed;
    this._rng = makeRng(this._seed);

    this._stock = createShuffledDeck(this._rng);
    this._registry = {};
    for (const card of this._stock.toArray()) {
      this._registry[card.id] = card;
    }

    this._waste = new Stack();
    this._foundations = [];
    for (let i = 0; i < FOUNDATION_COUNT; i += 1) {
      this._foundations.push(new Stack());
    }
    this._tableau = [];
    for (let i = 0; i < TABLEAU_COLUMNS; i += 1) {
      this._tableau.push(new DoublyLinkedList());
    }

    // Reparto triangular: la columna i recibe i + 1 cartas.
    for (let row = 0; row < TABLEAU_COLUMNS; row += 1) {
      for (let column = row; column < TABLEAU_COLUMNS; column += 1) {
        const card = this._stock.dequeue();
        if (card) this._tableau[column].insertAtEnd(card);
      }
    }
    for (let column = 0; column < TABLEAU_COLUMNS; column += 1) {
      const top = this._tableau[column].get(this._tableau[column].size() - 1);
      if (top) top.faceUp = true;
    }

    this._score = 0;
    this._moves = 0;
    this._status = 'playing';
    this._startedAt = Date.now();
    this._finishedAt = null;
    this._currentPass = 1;
    this._undoStack.clear();
    this._redoStack.clear();
    this.#buildPasses();
  }

  /**
   * Reconstruye el estado desde un snapshot. Los snapshots son datos planos;
   * las estructuras propias se reconstruyen a partir de los ids de las cartas.
   *
   * @param {object} snapshot
   * @param {{resetHistory?: boolean}} [options]
   * @returns {boolean}
   * @complexity O(n)
   */
  loadSnapshot(snapshot, options = {}) {
    if (!isSnapshotLike(snapshot)) return false;
    this.#ensureRegistry();
    this._drawCount = snapshot.drawCount === 3 ? 3 : 1;
    this._passLimit = this.#normalizePassLimit(snapshot.passLimit ?? 3);

    this._stock = new Queue();
    this._waste = new Stack();
    this._foundations = [];
    for (let i = 0; i < FOUNDATION_COUNT; i += 1) {
      this._foundations.push(new Stack());
    }
    this._tableau = [];
    for (let i = 0; i < TABLEAU_COLUMNS; i += 1) {
      this._tableau.push(new DoublyLinkedList());
    }

    for (const id of snapshot.stock) {
      const card = this._registry[id];
      if (!card) continue;
      card.faceUp = false;
      this._stock.enqueue(card);
    }
    for (const id of snapshot.waste) {
      const card = this._registry[id];
      if (!card) continue;
      card.faceUp = true;
      this._waste.push(card);
    }
    snapshot.foundations.forEach((pile, index) => {
      if (!this._foundations[index]) return;
      for (const id of pile) {
        const card = this._registry[id];
        if (!card) continue;
        card.faceUp = true;
        this._foundations[index].push(card);
      }
    });
    snapshot.tableau.forEach((pile, index) => {
      if (!this._tableau[index]) return;
      for (const item of pile) {
        const card = this._registry[item.id];
        if (!card) continue;
        card.faceUp = Boolean(item.faceUp);
        this._tableau[index].insertAtEnd(card);
      }
    });

    this._score = Number(snapshot.score) || 0;
    this._moves = Number(snapshot.moves) || 0;
    this._status = ['playing', 'won', 'lost'].includes(snapshot.status)
      ? snapshot.status
      : 'playing';
    this._startedAt = Number(snapshot.startedAt) || Date.now();
    this._finishedAt = Number(snapshot.finishedAt) || null;
    this._currentPass = Math.max(1, Number(snapshot.currentPass) || 1);
    this.#buildPasses();

    if (options.resetHistory !== false) {
      this._undoStack.clear();
      this._redoStack.clear();
    }
    return true;
  }

  /**
   * Devuelve una copia del estado actual.
   *
   * @returns {object}
   * @complexity O(n)
   */
  getSnapshot() {
    return cloneSnapshot(this.#captureSnapshot());
  }

  /**
   * Roba una o tres cartas. Si el mazo está vacío intenta reciclar.
   *
   * @returns {{ok: boolean, action?: string, drawn?: number, reason?: string}}
   * @complexity O(k), k = 1 o 3
   */
  drawOrRecycle() {
    if (this._status !== 'playing') return { ok: false, reason: 'La partida ya terminó.' };
    if (!this._stock.isEmpty()) return this.draw();
    if (!this._waste.isEmpty()) return this.recycle();
    this.#checkStatus();
    return { ok: false, reason: 'El mazo y el descarte están vacíos.' };
  }

  /**
   * Roba hasta `drawCount` cartas del mazo y las apila en el descarte.
   *
   * @returns {{ok: boolean, action?: string, drawn?: number, reason?: string}}
   * @complexity O(k)
   */
  draw() {
    if (this._status !== 'playing') return { ok: false, reason: 'La partida ya terminó.' };
    if (this._stock.isEmpty()) return { ok: false, reason: 'El mazo está vacío.' };

    this.#recordUndo();
    let drawn = 0;
    for (let i = 0; i < this._drawCount && !this._stock.isEmpty(); i += 1) {
      const card = this._stock.dequeue();
      card.faceUp = true;
      this._waste.push(card);
      drawn += 1;
    }
    this._moves += 1;
    this.#checkStatus();
    return { ok: true, action: 'draw', drawn };
  }

  /**
   * Recicla el descarte: lo voltea sobre el mazo conservando el orden real
   * de robo. Usa una pila temporal para invertir dos veces.
   *
   * @returns {{ok: boolean, action?: string, reason?: string}}
   * @complexity O(n)
   */
  recycle() {
    if (this._status !== 'playing') return { ok: false, reason: 'La partida ya terminó.' };
    if (!this._stock.isEmpty()) return { ok: false, reason: 'Todavía quedan cartas en el mazo.' };
    if (this._waste.isEmpty()) return { ok: false, reason: 'El descarte está vacío.' };
    if (this._passLimit !== Infinity && this._currentPass >= this._passLimit) {
      this.#checkStatus();
      return { ok: false, reason: 'No quedan pases disponibles.' };
    }

    this.#recordUndo();
    const temporary = new Stack();
    while (!this._waste.isEmpty()) {
      temporary.push(this._waste.pop());
    }
    while (!temporary.isEmpty()) {
      this._stock.enqueue(temporary.pop());
    }
    this._currentPass += 1;
    if (this._passLimit === Infinity) {
      this.#buildPasses();
    } else {
      this._passes.advance();
    }
    this._score = applyScore(this._score, SCORE_VALUES.RECYCLE);
    this._moves += 1;
    this.#checkStatus();
    return { ok: true, action: 'recycle' };
  }

  /**
   * Mueve la carta superior de una fuente a su fundación.
   *
   * @param {{type: 'waste'|'tableau', index?: number}} source
   * @param {string|null} [cardId]
   * @returns {{ok: boolean, action?: string, reason?: string}}
   * @complexity O(1) en el caso del descarte; O(n) en una columna.
   */
  moveToFoundation(source, cardId = null) {
    if (!this.canMoveToFoundation(source, cardId)) {
      return { ok: false, reason: 'Esa carta no puede ir a la fundación.' };
    }
    const card = this.#sourceTop(source);
    const foundationIndex = getFoundationIndex(card.suit.id);
    this.#recordUndo();
    this.#removeSourceTop(source);
    this._foundations[foundationIndex].push(card);
    card.faceUp = true;
    this._score = applyScore(this._score, SCORE_VALUES.FOUNDATION);
    this._moves += 1;
    if (source.type === 'tableau') this.#flipTop(this._tableau[source.index]);
    this.#checkStatus();
    return { ok: true, action: 'foundation' };
  }

  /**
   * Comprueba si una carta puede ir a su fundación.
   *
   * @param {{type: 'waste'|'tableau', index?: number}} source
   * @param {string|null} [cardId]
   * @returns {boolean}
   */
  canMoveToFoundation(source, cardId = null) {
    if (source.type !== 'waste' && source.type !== 'tableau') return false;
    const card = this.#sourceTop(source);
    if (!card || !card.faceUp) return false;
    if (cardId && card.id !== cardId) return false;
    const foundationIndex = getFoundationIndex(card.suit.id);
    return canPlaceOnFoundation(card, this._foundations[foundationIndex].peek());
  }

  /**
   * Mueve un grupo de una columna a otra.
   *
   * @param {number} fromIndex
   * @param {string} cardId
   * @param {number} toIndex
   * @returns {{ok: boolean, action?: string, reason?: string}}
   * @complexity O(n)
   */
  moveTableauToTableau(fromIndex, cardId, toIndex) {
    if (!this.canMoveTableauToTableau(fromIndex, cardId, toIndex)) {
      return { ok: false, reason: 'Ese grupo no puede colocarse ahí.' };
    }
    this.#recordUndo();
    const source = this._tableau[fromIndex];
    const destination = this._tableau[toIndex];
    const card = this._registry[cardId];
    const index = source.search(card);
    const group = source.splitFrom(index);
    group.traverseForward((item) => destination.insertAtEnd(item));
    this.#flipTop(source);
    this._moves += 1;
    this.#checkStatus();
    return { ok: true, action: 'tableau' };
  }

  /**
   * Comprueba si un grupo puede moverse entre columnas.
   *
   * @param {number} fromIndex
   * @param {string} cardId
   * @param {number} toIndex
   * @returns {boolean}
   */
  canMoveTableauToTableau(fromIndex, cardId, toIndex) {
    if (fromIndex === toIndex) return false;
    const source = this._tableau[fromIndex];
    const destination = this._tableau[toIndex];
    if (!source || !destination) return false;
    const card = this._registry[cardId];
    if (!card || !card.faceUp) return false;
    const index = source.search(card);
    if (index < 0) return false;

    let sequenceValid = true;
    let previous = null;
    source.traverseForward((item, itemIndex) => {
      if (!sequenceValid || itemIndex < index) return;
      if (!item.faceUp) {
        sequenceValid = false;
        return;
      }
      if (previous) {
        if (previous.value !== item.value + 1 || previous.color === item.color) {
          sequenceValid = false;
        }
      }
      previous = item;
    });
    if (!sequenceValid) return false;

    const destinationTop = destination.get(destination.size() - 1);
    return canPlaceOnTableau(card, destinationTop);
  }

  /**
   * Mueve la carta superior del descarte a una columna.
   *
   * @param {number} toIndex
   * @returns {{ok: boolean, action?: string, reason?: string}}
   * @complexity O(1)
   */
  moveWasteToTableau(toIndex) {
    if (!this.canMoveWasteToTableau(toIndex)) {
      return { ok: false, reason: 'La carta del descarte no puede ir a esa columna.' };
    }
    this.#recordUndo();
    const card = this._waste.pop();
    this._tableau[toIndex].insertAtEnd(card);
    this._moves += 1;
    this.#checkStatus();
    return { ok: true, action: 'waste-tableau' };
  }

  /**
   * @param {number} toIndex
   * @returns {boolean}
   */
  canMoveWasteToTableau(toIndex) {
    const card = this._waste.peek();
    const destination = this._tableau[toIndex];
    if (!card || !destination) return false;
    return canPlaceOnTableau(card, destination.get(destination.size() - 1));
  }

  /**
   * Devuelve una carta de una fundación al tablero.
   *
   * @param {number} foundationIndex
   * @param {number} toIndex
   * @returns {{ok: boolean, action?: string, reason?: string}}
   * @complexity O(1)
   */
  moveFoundationToTableau(foundationIndex, toIndex) {
    if (!this.canMoveFoundationToTableau(foundationIndex, toIndex)) {
      return { ok: false, reason: 'La carta de la fundación no puede ir a esa columna.' };
    }
    this.#recordUndo();
    const card = this._foundations[foundationIndex].pop();
    this._tableau[toIndex].insertAtEnd(card);
    this._score = applyScore(this._score, SCORE_VALUES.FOUNDATION_TO_TABLEAU);
    this._moves += 1;
    this.#checkStatus();
    return { ok: true, action: 'foundation-tableau' };
  }

  /**
   * @param {number} foundationIndex
   * @param {number} toIndex
   * @returns {boolean}
   */
  canMoveFoundationToTableau(foundationIndex, toIndex) {
    const card = this._foundations[foundationIndex]?.peek();
    const destination = this._tableau[toIndex];
    if (!card || !destination) return false;
    return canPlaceOnTableau(card, destination.get(destination.size() - 1));
  }

  /**
   * Intenta enviar automáticamente una carta a su fundación.
   *
   * @param {{type: 'waste'|'tableau', index?: number}} source
   * @param {string|null} [cardId]
   * @returns {{ok: boolean, action?: string, reason?: string}}
   */
  autoMoveToFoundation(source, cardId = null) {
    if (!this.canMoveToFoundation(source, cardId)) {
      return { ok: false, reason: 'No hay una fundación disponible para esa carta.' };
    }
    return this.moveToFoundation(source, cardId);
  }

  /**
   * Deshace la última acción.
   *
   * @returns {boolean}
   * @complexity O(n)
   */
  undo() {
    if (this._undoStack.isEmpty()) return false;
    const current = cloneSnapshot(this.#captureSnapshot());
    const previous = this._undoStack.pop();
    this._redoStack.push(current);
    this.loadSnapshot(previous, { resetHistory: false });
    return true;
  }

  /**
   * Rehace la última acción deshecha.
   *
   * @returns {boolean}
   * @complexity O(n)
   */
  redo() {
    if (this._redoStack.isEmpty()) return false;
    const current = cloneSnapshot(this.#captureSnapshot());
    const next = this._redoStack.pop();
    this._undoStack.push(current);
    this.loadSnapshot(next, { resetHistory: false });
    return true;
  }

  /**
   * @returns {boolean}
   */
  canUndo() {
    return !this._undoStack.isEmpty();
  }

  /**
   * @returns {boolean}
   */
  canRedo() {
    return !this._redoStack.isEmpty();
  }

  /**
   * El jugador se rinde: la partida termina como derrota.
   *
   * @returns {boolean}
   */
  surrender() {
    if (this._status !== 'playing') return false;
    this.#recordUndo();
    this._status = 'lost';
    this._finishedAt = Date.now();
    return true;
  }

  /**
   * Comprueba victoria o derrota. Se llama después de cada acción.
   *
   * @returns {void}
   * @private
   */
  #checkStatus() {
    if (this._status !== 'playing') return;
    const total = this._foundations.reduce((sum, pile) => sum + pile.size(), 0);
    if (total === 52) {
      this._status = 'won';
      this._score = applyScore(this._score, SCORE_VALUES.WIN);
      this._finishedAt = Date.now();
      return;
    }
    if (!this.#hasAnyMove()) {
      this._status = 'lost';
      this._finishedAt = Date.now();
    }
  }

  /**
   * Indica si existe al menos un movimiento útil. Los movimientos desde una
   * fundación al tablero no cuentan para la derrota, porque no hacen avanzar
   * la partida y permitirían ciclos infinitos.
   *
   * @returns {boolean}
   * @private
   */
  #hasAnyMove() {
    if (!this._stock.isEmpty()) return true;
    if (this.#canRecycle()) return true;
    if (this._waste.peek()) {
      if (this.canMoveToFoundation({ type: 'waste' })) return true;
      for (let column = 0; column < TABLEAU_COLUMNS; column += 1) {
        if (this.canMoveWasteToTableau(column)) return true;
      }
    }

    for (let column = 0; column < TABLEAU_COLUMNS; column += 1) {
      if (this.canMoveToFoundation({ type: 'tableau', index: column })) return true;
      let sourceHasMove = false;
      this._tableau[column].traverseForward((card) => {
        if (sourceHasMove || !card.faceUp) return;
        for (let target = 0; target < TABLEAU_COLUMNS; target += 1) {
          if (this.canMoveTableauToTableau(column, card.id, target)) {
            sourceHasMove = true;
            return;
          }
        }
      });
      if (sourceHasMove) return true;
    }
    return false;
  }

  /**
   * @returns {boolean}
   * @private
   */
  #canRecycle() {
    return (
      !this._waste.isEmpty() &&
      (this._passLimit === Infinity || this._currentPass < this._passLimit)
    );
  }

  /**
   * Devuelve una pista sencilla para el jugador.
   *
   * @returns {{type: string, from?: object, cardId?: string, foundationIndex?: number, toIndex?: number}}
   * @complexity O(n²)
   */
  getHint() {
    if (this._status !== 'playing') return { type: 'none' };

    if (this._waste.peek() && this.canMoveToFoundation({ type: 'waste' })) {
      const card = this._waste.peek();
      return {
        type: 'foundation',
        from: { type: 'waste' },
        cardId: card.id,
        foundationIndex: getFoundationIndex(card.suit.id),
      };
    }

    let fallbackFoundation = null;
    for (let column = 0; column < TABLEAU_COLUMNS; column += 1) {
      if (!this.canMoveToFoundation({ type: 'tableau', index: column })) continue;
      const card = this.#sourceTop({ type: 'tableau', index: column });
      const descriptor = {
        type: 'foundation',
        from: { type: 'tableau', index: column },
        cardId: card.id,
        foundationIndex: getFoundationIndex(card.suit.id),
      };
      if (this.#wouldReveal(column)) return descriptor;
      if (!fallbackFoundation) fallbackFoundation = descriptor;
    }
    if (fallbackFoundation) return fallbackFoundation;

    let fallbackTableau = null;
    for (let sourceIndex = 0; sourceIndex < TABLEAU_COLUMNS; sourceIndex += 1) {
      let found = null;
      this._tableau[sourceIndex].traverseForward((card) => {
        if (found || !card.faceUp) return;
        for (let target = 0; target < TABLEAU_COLUMNS; target += 1) {
          if (this.canMoveTableauToTableau(sourceIndex, card.id, target)) {
            found = {
              type: 'tableau',
              from: { type: 'tableau', index: sourceIndex },
              cardId: card.id,
              toIndex: target,
            };
            return;
          }
        }
      });
      if (found && this.#wouldReveal(sourceIndex)) return found;
      if (found && !fallbackTableau) fallbackTableau = found;
    }
    if (fallbackTableau) return fallbackTableau;

    if (this._waste.peek()) {
      for (let target = 0; target < TABLEAU_COLUMNS; target += 1) {
        const card = this._waste.peek();
        if (this.canMoveWasteToTableau(target)) {
          return {
            type: 'tableau',
            from: { type: 'waste' },
            cardId: card.id,
            toIndex: target,
          };
        }
      }
    }

    if (!this._stock.isEmpty()) return { type: 'draw' };
    if (this.#canRecycle()) return { type: 'recycle' };
    return { type: 'none' };
  }

  /**
   * Realiza un paso de auto-completado cuando ya no quedan cartas boca abajo.
   * La interfaz lo llama repetidamente con una pequeña animación.
   *
   * @returns {boolean}
   * @complexity O(n)
   */
  autoCompleteStep() {
    if (this._status !== 'playing') return false;
    for (let column = 0; column < TABLEAU_COLUMNS; column += 1) {
      let hasFaceDown = false;
      this._tableau[column].traverseForward((card) => {
        if (!card.faceUp) hasFaceDown = true;
      });
      if (hasFaceDown) return false;
    }

    if (this._waste.peek() && this.canMoveToFoundation({ type: 'waste' })) {
      this.moveToFoundation({ type: 'waste' });
      return true;
    }
    for (let column = 0; column < TABLEAU_COLUMNS; column += 1) {
      if (this.canMoveToFoundation({ type: 'tableau', index: column })) {
        this.moveToFoundation({ type: 'tableau', index: column });
        return true;
      }
    }
    return false;
  }

  /**
   * Indica si mover la carta superior de una columna revelaría otra.
   *
   * @param {number} columnIndex
   * @returns {boolean}
   * @private
   */
  #wouldReveal(columnIndex) {
    const column = this._tableau[columnIndex];
    if (column.size() < 2) return false;
    return !column.get(column.size() - 2).faceUp;
  }

  /**
   * Voltea la carta superior de una columna si está boca abajo.
   *
   * @param {DoublyLinkedList} column
   * @returns {boolean}
   * @private
   */
  #flipTop(column) {
    const top = column.get(column.size() - 1);
    if (top && !top.faceUp) {
      top.faceUp = true;
      this._score = applyScore(this._score, SCORE_VALUES.REVEAL);
      return true;
    }
    return false;
  }

  /**
   * @param {{type: 'waste'|'tableau', index?: number}} source
   * @returns {import('./Card.js').Card|null}
   * @private
   */
  #sourceTop(source) {
    if (source.type === 'waste') return this._waste.peek();
    if (source.type === 'tableau') {
      const column = this._tableau[source.index];
      return column ? column.get(column.size() - 1) : null;
    }
    return null;
  }

  /**
   * @param {{type: 'waste'|'tableau', index?: number}} source
   * @returns {void}
   * @private
   */
  #removeSourceTop(source) {
    if (source.type === 'waste') {
      this._waste.pop();
    } else if (source.type === 'tableau') {
      this._tableau[source.index].removeAt(this._tableau[source.index].size() - 1);
    }
  }

  /**
   * Construye la lista circular de pases y coloca el cursor en el pase actual.
   *
   * @returns {void}
   * @private
   */
  #buildPasses() {
    this._passes.clear();
    const nodes = this._passLimit === Infinity
      ? Math.max(3, this._currentPass)
      : this._passLimit;
    for (let pass = 1; pass <= nodes; pass += 1) {
      this._passes.insertAtEnd(pass);
    }
    if (!this._passes.isEmpty()) {
      this._passes.setCursor((this._currentPass - 1) % this._passes.size());
    }
  }

  /**
   * Guarda el estado actual en la pila de deshacer y limpia la de rehacer.
   *
   * @returns {void}
   * @private
   */
  #recordUndo() {
    this._undoStack.push(cloneSnapshot(this.#captureSnapshot()));
    this._redoStack.clear();
  }

  /**
   * @returns {object}
   * @private
   */
  #captureSnapshot() {
    return {
      version: SNAPSHOT_VERSION,
      drawCount: this._drawCount,
      passLimit: this._passLimit === Infinity ? 'infinite' : this._passLimit,
      currentPass: this._currentPass,
      stock: this._stock.toArray().map((card) => card.id),
      waste: this._waste.toArray().map((card) => card.id),
      foundations: this._foundations.map((pile) => pile.toArray().map((card) => card.id)),
      tableau: this._tableau.map((column) =>
        column.toArray().map((card) => ({ id: card.id, faceUp: card.faceUp })),
      ),
      score: this._score,
      moves: this._moves,
      status: this._status,
      startedAt: this._startedAt,
      finishedAt: this._finishedAt,
    };
  }

  /**
   * Crea el registro completo de cartas si aún no existe.
   *
   * @returns {void}
   * @private
   */
  #ensureRegistry() {
    if (Object.keys(this._registry).length < 52) {
      this._registry = createCardRegistry();
    }
  }

  /**
   * @param {number|string} value
   * @returns {number}
   * @private
   */
  #normalizePassLimit(value) {
    if (value === 'infinite' || value === Infinity) return Infinity;
    const number = Number(value);
    return Number.isFinite(number) && number >= 1 ? number : 3;
  }

  /**
   * Devuelve la carta registrada con ese identificador.
   * La interfaz lo usa para mostrar el palo y el valor.
   *
   * @param {string} cardId
   * @returns {import('./Card.js').Card|null}
   * @complexity O(1)
   */
  getCard(cardId) {
    this.#ensureRegistry();
    return this._registry[cardId] ?? null;
  }

  /**
   * Etiqueta legible de una carta, por ejemplo `K♠`.
   *
   * @param {string} cardId
   * @returns {string}
   * @complexity O(1)
   */
  getCardLabel(cardId) {
    return this.getCard(cardId)?.toString() ?? 'carta';
  }

  /**
   * @returns {number}
   */
  getScore() {
    return this._score;
  }

  /**
   * @returns {number}
   */
  getMoves() {
    return this._moves;
  }

  /**
   * @returns {'playing'|'won'|'lost'}
   */
  getStatus() {
    return this._status;
  }

  /**
   * @returns {number}
   */
  getElapsedSeconds() {
    const end = this._finishedAt ?? Date.now();
    return Math.max(0, Math.floor((end - this._startedAt) / 1000));
  }

  /**
   * @returns {number}
   */
  getDrawCount() {
    return this._drawCount;
  }

  /**
   * @returns {number}
   */
  getPassLimit() {
    return this._passLimit;
  }

  /**
   * @returns {number}
   */
  getSeed() {
    return this._seed ?? 0;
  }

  /**
   * @returns {{current: number, limit: number, remaining: number}}
   */
  getPassInfo() {
    return {
      current: this._currentPass,
      limit: this._passLimit,
      remaining: this._passLimit === Infinity
        ? Infinity
        : Math.max(0, this._passLimit - this._currentPass),
    };
  }

  /**
   * Información para el inspector de estructuras y la sustentación.
   *
   * @returns {object}
   */
  getDebugInfo() {
    const cards = (pile) => pile.toArray().map((card) => card.toString());
    return {
      stock: {
        size: this._stock.size(),
        front: this._stock.front()?.toString() ?? null,
        items: cards(this._stock),
      },
      waste: {
        size: this._waste.size(),
        top: this._waste.peek()?.toString() ?? null,
        items: cards(this._waste),
      },
      foundations: this._foundations.map((pile, index) => ({
        suit: FOUNDATION_SUITS[index].symbol,
        size: pile.size(),
        top: pile.peek()?.toString() ?? null,
        items: cards(pile),
      })),
      tableau: this._tableau.map((column, index) => {
        const forward = [];
        const backward = [];
        column.traverseForward((card) => forward.push(card.toString()));
        column.traverseBackward((card) => backward.push(card.toString()));
        return { index: index + 1, size: column.size(), forward, backward };
      }),
      passes: {
        size: this._passes.size(),
        current: this._passes.current(),
        items: this._passes.toArray(),
      },
      undo: this._undoStack.size(),
      redo: this._redoStack.size(),
    };
  }
}
