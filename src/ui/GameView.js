import { h, formatTime } from '../utils/dom.js';
import { FOUNDATION_SUITS, isValidSequence } from '../game/Rules.js';
import { describeMode } from './MenuView.js';

const TABLEAU_COLUMNS = 7;

/**
 * Vista del tablero de Klondike.
 *
 * La vista no modifica el estado por su cuenta: siempre llama a los métodos
 * de `KlondikeGame` y vuelve a dibujar desde un snapshot. Los eventos se
 * delegan en el tablero para que reconstruir las cartas no duplique listeners.
 */
export class GameView {
  /**
   * @param {import('../game/KlondikeGame.js').KlondikeGame} game
   * @param {{
   *   onMenu?: () => void,
   *   onHelp?: () => void,
   *   onInspect?: () => void,
   *   onSurrender?: () => void,
   *   onStatusChange?: (status: 'playing'|'won'|'lost') => void,
   * }} [options]
   */
  constructor(game, options = {}) {
    this.game = game;
    this.options = options;
    /** @type {null|{origin: 'waste'|'tableau'|'foundation', column?: number, cardId?: string, index?: number}} */
    this.selection = null;
    /** @type {object|null} */
    this.hint = null;
    this.lastStatus = game.getStatus();
    this.autoRunning = false;

    /** @type {HTMLElement|null} */
    this.container = null;
    /** @type {Record<string, HTMLElement>} */
    this.refs = {};
    /** @type {number|null} */
    this.timer = null;
    /** @type {number|null} */
    this.autoTimer = null;
  }

  /**
   * Monta la vista dentro del contenedor.
   *
   * @param {HTMLElement} container
   * @returns {void}
   */
  mount(container) {
    this.container = container;
    this.#buildShell();
    this.#sync();
    this.timer = window.setInterval(() => this.#updateTime(), 1000);
    document.addEventListener('keydown', this.#onKeyDown);
    this.#announce('Haz clic en el mazo para robar o selecciona una carta.');
  }

  /**
   * Vuelve a dibujar desde el estado actual (por ejemplo, tras rendirse).
   *
   * @returns {void}
   */
  refresh() {
    this.#sync();
  }

  /**
   * Desmonta la vista y limpia temporizadores y listeners.
   *
   * @returns {void}
   */
  destroy() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.#stopAuto();
    document.removeEventListener('keydown', this.#onKeyDown);
    if (this.container) this.container.replaceChildren();
    this.container = null;
  }

  // ------------------------------------------------------------ Interfaz

  /**
   * @returns {void}
   * @private
   */
  #buildShell() {
    if (!this.container) return;

    const stat = (label, key) => h('div', { class: 'stat' },
      h('span', { class: 'stat__label' }, label),
      h('strong', { class: 'stat__value', dataset: { stat: key } }, '0'),
    );

    const action = (command, label, icon, title, handler) => h('button', {
      class: 'button button--ghost button--small game__action',
      type: 'button',
      dataset: { command },
      title,
      'aria-label': title,
      on: { click: handler },
    },
      h('span', { class: 'game__action-icon', 'aria-hidden': 'true' }, icon),
      h('span', { class: 'game__action-text' }, label),
    );

    const shell = h('div', { class: 'game', dataset: { screen: 'game' } },
      h('header', { class: 'game__bar' },
        h('div', { class: 'game__bar-start' },
          h('button', {
            class: 'button button--ghost button--small',
            type: 'button',
            on: { click: () => this.options.onMenu?.() },
          }, '← Menú'),
        ),
        h('div', { class: 'game__stats' },
          stat('Puntaje', 'score'),
          stat('Movimientos', 'moves'),
          stat('Tiempo', 'time'),
          stat('Pases', 'passes'),
        ),
        h('div', { class: 'game__actions' },
          action('undo', 'Deshacer', '↶', 'Deshacer el último movimiento (U)', () => this.#undo()),
          action('redo', 'Rehacer', '↷', 'Rehacer el movimiento deshecho (Y)', () => this.#redo()),
          action('hint', 'Pista', '💡', 'Mostrar una pista (P)', () => this.#hint()),
          action('auto', 'Auto', '⚡', 'Autocompletar cuando todo esté boca arriba (A)', () => this.#autoComplete()),
          action('inspect', 'Estructuras', '🧩', 'Inspector de estructuras (I)', () => this.options.onInspect?.()),
          action('surrender', 'Rendirse', '🏳️', 'Terminar la partida como derrota', () => this.options.onSurrender?.()),
          action('help', 'Ayuda', '?', 'Cómo jugar', () => this.options.onHelp?.()),
        ),
      ),
      h('p', { class: 'game__message', role: 'status', 'aria-live': 'polite' }),
      h('div', {
        class: 'board',
        on: {
          click: this.#onBoardClick,
          dblclick: this.#onBoardDoubleClick,
          keydown: this.#onBoardKeyDown,
          dragstart: this.#onDragStart,
          dragover: this.#onDragOver,
          dragleave: this.#onDragLeave,
          drop: this.#onDrop,
          dragend: this.#onDragEnd,
        },
      }),
      h('footer', { class: 'game__footer' },
        h('span', {}, 'Semilla ', h('code', {}, String(this.game.getSeed()))),
        h('span', { 'aria-hidden': 'true' }, '·'),
        h('span', {}, describeMode({
          drawCount: this.game.getDrawCount(),
          passLimit: this.game.getPassLimit(),
        })),
        h('span', { class: 'game__footer-spacer' }),
        h('span', {}, 'Estructuras de Datos · 2026'),
      ),
    );

    this.container.replaceChildren(shell);
    this.refs = {
      shell,
      board: shell.querySelector('.board'),
      message: shell.querySelector('.game__message'),
      score: shell.querySelector('[data-stat="score"]'),
      moves: shell.querySelector('[data-stat="moves"]'),
      time: shell.querySelector('[data-stat="time"]'),
      passes: shell.querySelector('[data-stat="passes"]'),
      undo: shell.querySelector('[data-command="undo"]'),
      redo: shell.querySelector('[data-command="redo"]'),
      auto: shell.querySelector('[data-command="auto"]'),
      surrender: shell.querySelector('[data-command="surrender"]'),
    };
  }

  /**
   * Sincroniza contadores, tablero y estado.
   *
   * @returns {void}
   * @private
   */
  #sync() {
    this.#renderStats();
    this.#renderBoard();
    this.#updateTime();
    this.#reportStatus();
  }

  /**
   * @returns {void}
   * @private
   */
  #renderStats() {
    if (!this.refs.score) return;
    const info = this.game.getPassInfo();
    this.refs.score.textContent = String(this.game.getScore());
    this.refs.moves.textContent = String(this.game.getMoves());
    this.refs.time.textContent = formatTime(this.game.getElapsedSeconds());
    this.refs.passes.textContent = info.limit === Infinity
      ? `${info.current} / ∞`
      : `${info.current} / ${info.limit}`;
    this.refs.passes.title = info.limit === Infinity
      ? `Pase actual: ${info.current}. Pases ilimitados.`
      : `Pase actual: ${info.current} de ${info.limit}.`;

    this.refs.undo.disabled = !this.game.canUndo();
    this.refs.redo.disabled = !this.game.canRedo();
    this.refs.auto.disabled = this.autoRunning || !this.#canAutoComplete();
    this.refs.surrender.disabled = this.game.getStatus() !== 'playing';
  }

  /**
   * @returns {void}
   * @private
   */
  #updateTime() {
    if (this.refs.time) {
      this.refs.time.textContent = formatTime(this.game.getElapsedSeconds());
    }
  }

  /**
   * @returns {void}
   * @private
   */
  #reportStatus() {
    const status = this.game.getStatus();
    if (status === this.lastStatus) return;
    this.lastStatus = status;

    if (status !== 'playing') {
      this.#stopAuto();
      if (this.timer !== null) {
        window.clearInterval(this.timer);
        this.timer = null;
      }
      this.selection = null;
      this.#renderBoard();
    } else if (this.timer === null) {
      this.timer = window.setInterval(() => this.#updateTime(), 1000);
    }
    this.options.onStatusChange?.(status);
  }

  // ------------------------------------------------------------ Tablero

  /**
   * Vuelve a construir el tablero completo.
   *
   * @returns {void}
   * @private
   */
  #renderBoard() {
    if (!this.refs.board) return;
    const snapshot = this.game.getSnapshot();
    const targets = this.#computeTargets();

    const topRow = h('div', { class: 'board__row board__row--top' },
      this.#renderStock(snapshot),
      this.#renderWaste(snapshot),
      h('div', { class: 'board__spacer', 'aria-hidden': 'true' }),
      ...snapshot.foundations.map((pile, index) => this.#renderFoundation(pile, index, targets)),
    );

    const tableauRow = h('div', { class: 'board__row board__row--tableau' },
      ...snapshot.tableau.map((column, index) => this.#renderColumn(column, index, targets)),
    );

    this.refs.board.replaceChildren(topRow, tableauRow);
  }

  /**
   * @param {object} snapshot
   * @returns {HTMLElement}
   * @private
   */
  #renderStock(snapshot) {
    const count = snapshot.stock.length;
    const info = this.game.getPassInfo();
    const canRecycle = count === 0 &&
      snapshot.waste.length > 0 &&
      (info.limit === Infinity || info.current < info.limit);
    const isHint = this.hint?.type === 'draw' || this.hint?.type === 'recycle';
    const classes = ['pile', 'pile--stock'];
    if (count === 0) classes.push('pile--empty');
    if (canRecycle) classes.push('pile--recycle');
    if (isHint) classes.push('pile--hint');

    const label = count > 0
      ? `Mazo con ${count} cartas. Robar.`
      : canRecycle
        ? 'Mazo vacío. Reciclar el descarte.'
        : 'Mazo vacío.';

    const pile = h('div', {
      class: classes.join(' '),
      dataset: { zone: 'stock' },
      role: 'button',
      tabindex: count > 0 || canRecycle ? '0' : '-1',
      'aria-label': label,
      title: label,
    });

    if (count > 0) {
      pile.append(h('span', { class: 'card card--back pile__top-card', 'aria-hidden': 'true' },
        h('span', { class: 'card__back-pattern' }),
      ));
      pile.append(h('span', { class: 'pile__badge' }, String(count)));
    } else {
      pile.append(h('span', {
        class: 'pile__ghost',
        'aria-hidden': 'true',
      }, canRecycle ? '↻' : '∅'));
      if (canRecycle) pile.append(h('span', { class: 'pile__ghost-text' }, 'Reciclar'));
    }

    return pile;
  }

  /**
   * @param {object} snapshot
   * @returns {HTMLElement}
   * @private
   */
  #renderWaste(snapshot) {
    const total = snapshot.waste.length;
    const visible = snapshot.waste.slice(-3);
    const topId = total > 0 ? snapshot.waste[total - 1] : null;
    const selected = this.selection?.origin === 'waste' && topId !== null;
    const isHint = this.hint?.from?.type === 'waste';

    const pile = h('div', {
      class: `pile pile--waste${total === 0 ? ' pile--empty' : ''}${isHint ? ' pile--hint' : ''}`,
      dataset: { zone: 'waste' },
      role: 'button',
      tabindex: total > 0 ? '0' : '-1',
      'aria-label': total > 0
        ? `Descarte con ${total} cartas. Carta superior: ${this.game.getCardLabel(topId)}.`
        : 'Descarte vacío.',
      title: total > 0 ? 'Descarte' : 'Descarte vacío',
    });

    if (total === 0) {
      pile.append(h('span', { class: 'pile__ghost', 'aria-hidden': 'true' }, '♻'));
      pile.append(h('span', { class: 'pile__ghost-text' }, 'Descarte'));
      return pile;
    }

    visible.forEach((cardId, index) => {
      const isTop = cardId === topId;
      pile.append(this.#renderCard(cardId, {
        faceUp: true,
        zone: 'waste',
        selected: isTop && selected,
        hint: isTop && isHint,
        draggable: isTop,
        style: {
          left: `calc(${index} * var(--card-w) * 0.075)`,
          zIndex: String(index + 1),
        },
      }));
    });
    pile.append(h('span', { class: 'pile__badge' }, String(total)));

    return pile;
  }

  /**
   * @param {string[]} pile
   * @param {number} index
   * @param {{foundations: Set<number>, tableau: Set<number>}} targets
   * @returns {HTMLElement}
   * @private
   */
  #renderFoundation(pile, index, targets) {
    const suit = FOUNDATION_SUITS[index];
    const topId = pile.length > 0 ? pile[pile.length - 1] : null;
    const classes = ['pile', 'pile--foundation'];
    if (pile.length === 0) classes.push('pile--empty');
    if (targets.foundations.has(index)) classes.push('pile--valid');
    if (this.hint?.foundationIndex === index) classes.push('pile--hint');

    const node = h('div', {
      class: classes.join(' '),
      dataset: { zone: 'foundation', foundation: String(index) },
      role: 'button',
      tabindex: '0',
      'aria-label': `Fundación de ${suit.name}, ${pile.length} cartas${topId ? `, arriba ${this.game.getCardLabel(topId)}` : ''}.`,
      title: `Fundación de ${suit.name}`,
    },
    h('span', { class: 'pile__watermark', 'aria-hidden': 'true' }, suit.symbol),
    );

    if (topId) {
      const selected = this.selection?.origin === 'foundation' && this.selection.index === index;
      node.append(this.#renderCard(topId, {
        faceUp: true,
        zone: 'foundation',
        foundation: index,
        selected,
        draggable: true,
      }));
      node.append(h('span', { class: 'pile__badge pile__badge--soft' }, String(pile.length)));
    }

    return node;
  }

  /**
   * @param {Array<{id: string, faceUp: boolean}>} column
   * @param {number} index
   * @param {{foundations: Set<number>, tableau: Set<number>}} targets
   * @returns {HTMLElement}
   * @private
   */
  #renderColumn(column, index, targets) {
    const classes = ['pile', 'pile--tableau'];
    if (column.length === 0) classes.push('pile--empty');
    if (targets.tableau.has(index)) classes.push('pile--valid');
    const hinted = (this.hint?.from?.type === 'tableau' && this.hint.from.index === index) ||
      this.hint?.toIndex === index;
    if (hinted) classes.push('pile--hint');

    const node = h('div', {
      class: classes.join(' '),
      dataset: { zone: 'tableau', column: String(index) },
      role: 'group',
      'aria-label': `Columna ${index + 1}, ${column.length} ${column.length === 1 ? 'carta' : 'cartas'}.`,
    },
    h('span', { class: 'pile__watermark pile__watermark--king', 'aria-hidden': 'true' }, 'K'),
    );

    column.forEach((item, cardIndex) => {
      const selected = this.selection?.origin === 'tableau' &&
        this.selection.column === index &&
        this.selection.cardId === item.id;
      const isHint = this.hint?.cardId === item.id;
      node.append(this.#renderCard(item.id, {
        faceUp: item.faceUp,
        zone: 'tableau',
        column: index,
        cardIndex,
        selected,
        hint: isHint,
        draggable: item.faceUp && this.#canSelectGroup(index, item.id),
      }));
    });

    return node;
  }

  /**
   * @param {string} cardId
   * @param {{
   *   faceUp: boolean,
   *   zone: string,
   *   column?: number,
   *   foundation?: number,
   *   cardIndex?: number,
   *   selected?: boolean,
   *   hint?: boolean,
   *   draggable?: boolean,
   *   style?: Record<string, string>,
   * }} options
   * @returns {HTMLElement}
   * @private
   */
  #renderCard(cardId, options) {
    const card = this.game.getCard(cardId);
    const faceUp = options.faceUp !== false;
    const classes = ['card'];
    if (!faceUp) {
      classes.push('card--back');
    } else {
      classes.push('card--up', `card--${card?.color ?? 'black'}`);
    }
    if (options.selected) classes.push('card--selected');
    if (options.hint) classes.push('card--hint');

    const dataset = {
      cardId,
      zone: options.zone,
    };
    if (options.column !== undefined) dataset.column = String(options.column);
    if (options.foundation !== undefined) dataset.foundation = String(options.foundation);
    if (options.cardIndex !== undefined) dataset.cardIndex = String(options.cardIndex);

    const node = h('div', {
      class: classes.join(' '),
      dataset,
      draggable: Boolean(options.draggable),
      style: options.style ?? {},
      title: faceUp && card ? `${card.label} de ${card.suit.name}` : 'Carta boca abajo',
      'aria-label': faceUp && card ? `${card.label} de ${card.suit.name}` : 'Carta boca abajo',
    });

    if (faceUp && card) {
      node.append(h('span', { class: 'card__face' },
        h('span', { class: 'card__corner card__corner--tl' },
          h('span', { class: 'card__rank' }, card.label),
          h('span', { class: 'card__suit' }, card.suit.symbol),
        ),
        h('span', { class: 'card__pip', 'aria-hidden': 'true' }, card.suit.symbol),
        h('span', { class: 'card__corner card__corner--br', 'aria-hidden': 'true' },
          h('span', { class: 'card__rank' }, card.label),
          h('span', { class: 'card__suit' }, card.suit.symbol),
        ),
      ));
    } else {
      node.append(h('span', { class: 'card__back-pattern', 'aria-hidden': 'true' }));
    }

    return node;
  }

  // ------------------------------------------------------------ Selección

  /**
   * @returns {{foundations: Set<number>, tableau: Set<number>}}
   * @private
   */
  #computeTargets() {
    const foundations = new Set();
    const tableau = new Set();
    if (!this.selection) return { foundations, tableau };
    for (let index = 0; index < FOUNDATION_SUITS.length; index += 1) {
      if (this.#isValidTarget('foundation', index)) foundations.add(index);
    }
    for (let index = 0; index < TABLEAU_COLUMNS; index += 1) {
      if (this.#isValidTarget('tableau', index)) tableau.add(index);
    }
    return { foundations, tableau };
  }

  /**
   * @param {'foundation'|'tableau'} kind
   * @param {number} index
   * @returns {boolean}
   * @private
   */
  #isValidTarget(kind, index) {
    const selection = this.selection;
    if (!selection || !Number.isInteger(index)) return false;
    try {
      if (kind === 'foundation') {
        if (index < 0 || index >= FOUNDATION_SUITS.length) return false;
        const card = this.game.getCard(this.#selectionCardId());
        if (!card || card.suit.id !== FOUNDATION_SUITS[index].id) return false;
        if (selection.origin === 'waste') {
          return this.game.canMoveToFoundation({ type: 'waste' });
        }
        if (selection.origin === 'tableau') {
          return this.game.canMoveToFoundation(
            { type: 'tableau', index: selection.column },
            selection.cardId,
          );
        }
        return false;
      }
      if (index < 0 || index >= TABLEAU_COLUMNS) return false;
      if (selection.origin === 'waste') return this.game.canMoveWasteToTableau(index);
      if (selection.origin === 'tableau') {
        return this.game.canMoveTableauToTableau(selection.column, selection.cardId, index);
      }
      if (selection.origin === 'foundation') {
        return this.game.canMoveFoundationToTableau(selection.index, index);
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * @returns {string|null}
   * @private
   */
  #selectionCardId() {
    const selection = this.selection;
    if (!selection) return null;
    if (selection.origin === 'waste') {
      return this.game.getSnapshot().waste.at(-1) ?? null;
    }
    if (selection.origin === 'tableau') return selection.cardId ?? null;
    if (selection.origin === 'foundation') {
      return this.game.getSnapshot().foundations[selection.index]?.at(-1) ?? null;
    }
    return null;
  }

  /**
   * @param {number} column
   * @param {string} cardId
   * @returns {boolean}
   * @private
   */
  #canSelectGroup(column, cardId) {
    const snapshot = this.game.getSnapshot();
    const cards = snapshot.tableau[column];
    if (!cards) return false;
    const start = cards.findIndex((item) => item.id === cardId);
    if (start < 0) return false;
    const sequence = cards.slice(start).map((item) => this.game.getCard(item.id));
    return isValidSequence(sequence);
  }

  /**
   * @param {boolean} [withMessage]
   * @returns {void}
   * @private
   */
  #clearSelection(withMessage = false) {
    const hadSelection = this.selection !== null;
    this.selection = null;
    this.hint = null;
    this.#renderBoard();
    if (withMessage && hadSelection) this.#announce('Selección cancelada.');
  }

  /**
   * @param {'foundation'|'tableau'} kind
   * @param {number} index
   * @returns {boolean}
   * @private
   */
  #moveSelectionTo(kind, index) {
    const selection = this.selection;
    if (!selection) return false;
    const cardId = this.#selectionCardId();
    const label = cardId ? this.game.getCardLabel(cardId) : 'La carta';

    if (!this.#isValidTarget(kind, index)) {
      if (kind === 'foundation') {
        this.#announce('Esa carta no puede ir a esa fundación.', 'warn');
      } else {
        this.#announce('Ese movimiento no es válido.', 'warn');
      }
      this.#renderBoard();
      return false;
    }

    let result;
    if (kind === 'foundation') {
      if (selection.origin === 'waste') {
        result = this.game.moveToFoundation({ type: 'waste' });
      } else if (selection.origin === 'tableau') {
        result = this.game.moveToFoundation(
          { type: 'tableau', index: selection.column },
          selection.cardId,
        );
      } else {
        this.#announce('Solo puedes mover la carta superior de una fundación al tablero.', 'warn');
        return false;
      }
    } else if (selection.origin === 'waste') {
      result = this.game.moveWasteToTableau(index);
    } else if (selection.origin === 'tableau') {
      result = this.game.moveTableauToTableau(selection.column, selection.cardId, index);
    } else if (selection.origin === 'foundation') {
      result = this.game.moveFoundationToTableau(selection.index, index);
    } else {
      return false;
    }

    if (!result.ok) {
      this.#announce(result.reason ?? 'Ese movimiento no es válido.', 'warn');
      this.#renderBoard();
      return false;
    }

    this.selection = null;
    this.hint = null;
    this.#announce(
      kind === 'foundation'
        ? `${label} fue enviada a su fundación.`
        : `Movimiento realizado con ${label}.`,
      'ok',
    );
    this.#sync();
    return true;
  }

  // ------------------------------------------------------------ Acciones

  /**
   * @returns {void}
   * @private
   */
  #draw() {
    this.#stopAuto();
    this.selection = null;
    this.hint = null;
    const result = this.game.drawOrRecycle();
    if (!result.ok) {
      this.#announce(result.reason ?? 'No se pudo robar.', 'warn');
      this.#sync();
      return;
    }
    if (result.action === 'recycle') {
      const info = this.game.getPassInfo();
      const passText = info.limit === Infinity
        ? `pase ${info.current} (sin límite)`
        : `pase ${info.current} de ${info.limit}`;
      this.#announce(`Descarte reciclado. Ahora vas en el ${passText}.`, 'ok');
    } else {
      this.#announce(`Robaste ${result.drawn} ${result.drawn === 1 ? 'carta' : 'cartas'}.`, 'ok');
    }
    this.#sync();
  }

  /**
   * @returns {void}
   * @private
   */
  #undo() {
    this.#stopAuto();
    this.selection = null;
    this.hint = null;
    if (!this.game.canUndo()) {
      this.#announce('No hay acciones para deshacer.', 'warn');
      return;
    }
    const ok = this.game.undo();
    this.#announce(ok ? 'Acción deshecha.' : 'No se pudo deshacer.', ok ? 'ok' : 'warn');
    this.#sync();
  }

  /**
   * @returns {void}
   * @private
   */
  #redo() {
    this.#stopAuto();
    this.selection = null;
    this.hint = null;
    if (!this.game.canRedo()) {
      this.#announce('No hay acciones para rehacer.', 'warn');
      return;
    }
    const ok = this.game.redo();
    this.#announce(ok ? 'Acción rehecha.' : 'No se pudo rehacer.', ok ? 'ok' : 'warn');
    this.#sync();
  }

  /**
   * @returns {void}
   * @private
   */
  #hint() {
    this.#stopAuto();
    this.selection = null;
    const hint = this.game.getHint();
    this.hint = hint.type === 'none' ? null : hint;

    if (hint.type === 'draw') {
      this.#announce('Pista: roba una carta del mazo.', 'ok');
    } else if (hint.type === 'recycle') {
      this.#announce('Pista: recicla el descarte para volver a jugar.', 'ok');
    } else if (hint.type === 'foundation') {
      this.#announce(`Pista: mueve ${this.game.getCardLabel(hint.cardId)} a su fundación.`, 'ok');
    } else if (hint.type === 'tableau') {
      this.#announce(
        `Pista: mueve ${this.game.getCardLabel(hint.cardId)} a la columna ${hint.toIndex + 1}.`,
        'ok',
      );
    } else {
      this.#announce('No hay movimientos disponibles.', 'warn');
    }
    this.#sync();
  }

  /**
   * @returns {void}
   * @private
   */
  #autoComplete() {
    if (this.autoRunning) return;
    if (!this.#canAutoComplete()) {
      this.#announce('Todavía hay cartas boca abajo. Voltea todas antes de autocompletar.', 'warn');
      return;
    }

    this.autoRunning = true;
    this.selection = null;
    this.hint = null;
    this.#announce('Autocompletando las cartas que ya pueden ir a las fundaciones…');
    this.#renderStats();

    const step = () => {
      const moved = this.game.autoCompleteStep();
      if (!moved || this.game.getStatus() !== 'playing') {
        this.#stopAuto();
      }
      this.#sync();
    };

    this.autoTimer = window.setInterval(step, 180);
    step();
  }

  /**
   * @returns {boolean}
   * @private
   */
  #canAutoComplete() {
    if (this.game.getStatus() !== 'playing') return false;
    const snapshot = this.game.getSnapshot();
    return snapshot.tableau.every((column) => column.every((card) => card.faceUp));
  }

  /**
   * @returns {void}
   * @private
   */
  #stopAuto() {
    if (this.autoTimer !== null) {
      window.clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
    if (this.autoRunning) {
      this.autoRunning = false;
      this.#renderStats();
    }
  }

  /**
   * @param {string} text
   * @param {''|'ok'|'warn'} [tone]
   * @returns {void}
   * @private
   */
  #announce(text, tone = '') {
    if (!this.refs.message) return;
    this.refs.message.textContent = text;
    this.refs.message.className = `game__message${tone ? ` game__message--${tone}` : ''}`;
  }

  // ------------------------------------------------------------ Eventos

  /**
   * @param {MouseEvent} event
   * @returns {void}
   * @private
   */
  #onBoardClick = (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-zone]')
      : null;
    if (!target || !this.refs.board?.contains(target)) return;
    if (event.detail > 1) return;
    this.#stopAuto();

    const zone = target.dataset.zone;
    if (zone === 'stock') {
      this.#draw();
      return;
    }
    if (zone === 'waste') {
      this.#onWasteClick();
      return;
    }
    if (zone === 'foundation') {
      this.#onFoundationClick(Number(target.dataset.foundation));
      return;
    }
    if (zone === 'tableau') {
      this.#onTableauClick(Number(target.dataset.column), target.dataset.cardId ?? null);
    }
  };

  /**
   * @returns {void}
   * @private
   */
  #onWasteClick() {
    this.hint = null;
    if (this.selection) {
      this.#clearSelection(true);
      return;
    }
    const topId = this.game.getSnapshot().waste.at(-1);
    if (!topId) {
      this.#announce('El descarte está vacío.', 'warn');
      this.#renderBoard();
      return;
    }
    this.selection = { origin: 'waste', cardId: topId };
    this.#announce(
      `Seleccionaste ${this.game.getCardLabel(topId)}. Elige una fundación o una columna.`,
      'ok',
    );
    this.#renderBoard();
  }

  /**
   * @param {number} index
   * @returns {void}
   * @private
   */
  #onFoundationClick(index) {
    if (!Number.isInteger(index)) return;
    this.hint = null;

    if (!this.selection) {
      const topId = this.game.getSnapshot().foundations[index]?.at(-1);
      if (!topId) {
        this.#announce(`La fundación de ${FOUNDATION_SUITS[index].name} está vacía.`, 'warn');
        return;
      }
      this.selection = { origin: 'foundation', index };
      this.#announce(
        `Seleccionaste ${this.game.getCardLabel(topId)}. Elige una columna del tablero.`,
        'ok',
      );
      this.#renderBoard();
      return;
    }

    if (this.selection.origin === 'foundation') {
      if (this.selection.index === index) {
        this.#clearSelection(true);
      } else {
        this.#announce('Selecciona una columna del tablero para mover esa carta.', 'warn');
      }
      return;
    }

    this.#moveSelectionTo('foundation', index);
  }

  /**
   * @param {number} column
   * @param {string|null} cardId
   * @returns {void}
   * @private
   */
  #onTableauClick(column, cardId) {
    this.hint = null;
    if (this.selection) {
      if (this.selection.origin === 'tableau' && this.selection.column === column) {
        this.#clearSelection(true);
        return;
      }
      this.#moveSelectionTo('tableau', column);
      return;
    }

    if (!cardId) {
      this.#announce('Columna vacía. Solo se puede colocar un Rey.', 'warn');
      return;
    }

    const card = this.game.getCard(cardId);
    if (!card) return;
    if (!card.faceUp) {
      this.#announce('Esa carta está boca abajo.', 'warn');
      return;
    }
    if (!this.#canSelectGroup(column, cardId)) {
      this.#announce('Esa secuencia no se puede mover.', 'warn');
      return;
    }

    this.selection = { origin: 'tableau', column, cardId };
    this.#announce(
      `Seleccionaste ${card.label}${card.suit.symbol}. Elige una columna o una fundación.`,
      'ok',
    );
    this.#renderBoard();
  }

  /**
   * Activa una pila con Enter o Espacio cuando tiene el foco.
   *
   * @param {KeyboardEvent} event
   * @returns {void}
   * @private
   */
  #onBoardKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target instanceof Element
      ? event.target.closest('[data-zone]')
      : null;
    if (!target || !this.refs.board?.contains(target)) return;
    event.preventDefault();
    target.click();
  };

  /**
   * @param {MouseEvent} event
   * @returns {void}
   * @private
   */
  #onBoardDoubleClick = (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('[data-zone]')
      : null;
    if (!target) return;
    this.#stopAuto();
    this.hint = null;

    const zone = target.dataset.zone;
    if (zone === 'waste') {
      const topId = this.game.getSnapshot().waste.at(-1);
      if (!topId) return;
      this.selection = null;
      const result = this.game.moveToFoundation({ type: 'waste' });
      this.#completeMove(result, `${this.game.getCardLabel(topId)} fue enviada a su fundación.`);
    } else if (zone === 'tableau') {
      const column = Number(target.dataset.column);
      const cardId = target.dataset.cardId;
      const topId = this.game.getSnapshot().tableau[column]?.at(-1)?.id;
      if (!cardId || topId !== cardId) return;
      this.selection = null;
      const result = this.game.moveToFoundation({ type: 'tableau', index: column }, cardId);
      this.#completeMove(result, `${this.game.getCardLabel(cardId)} fue enviada a su fundación.`);
    }
  };

  /**
   * @param {{ok: boolean, reason?: string}} result
   * @param {string} message
   * @returns {void}
   * @private
   */
  #completeMove(result, message) {
    if (!result.ok) {
      this.#announce(result.reason ?? 'Ese movimiento no es válido.', 'warn');
    } else {
      this.#announce(message, 'ok');
    }
    this.#sync();
  }

  /**
   * @param {DragEvent} event
   * @returns {void}
   * @private
   */
  #onDragStart = (event) => {
    const cardNode = event.target instanceof Element
      ? event.target.closest('.card')
      : null;
    if (!cardNode || cardNode.classList.contains('card--back') || !this.refs.board?.contains(cardNode)) {
      event.preventDefault();
      return;
    }
    const zone = cardNode.dataset.zone;
    if (zone === 'waste') {
      const topId = this.game.getSnapshot().waste.at(-1);
      if (!topId || topId !== cardNode.dataset.cardId) {
        event.preventDefault();
        return;
      }
      this.selection = { origin: 'waste', cardId: topId };
    } else if (zone === 'foundation') {
      const index = Number(cardNode.dataset.foundation);
      const topId = this.game.getSnapshot().foundations[index]?.at(-1);
      if (!topId || topId !== cardNode.dataset.cardId) {
        event.preventDefault();
        return;
      }
      this.selection = { origin: 'foundation', index };
    } else if (zone === 'tableau') {
      const column = Number(cardNode.dataset.column);
      const cardId = cardNode.dataset.cardId;
      if (!cardId || !this.#canSelectGroup(column, cardId)) {
        event.preventDefault();
        return;
      }
      this.selection = { origin: 'tableau', column, cardId };
    } else {
      event.preventDefault();
      return;
    }

    this.hint = null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', cardNode.dataset.cardId ?? 'carta');
    }
  };

  /**
   * @param {DragEvent} event
   * @returns {void}
   * @private
   */
  #onDragOver = (event) => {
    if (!this.selection) return;
    const pile = event.target instanceof Element ? event.target.closest('.pile') : null;
    if (!pile || !this.refs.board?.contains(pile)) return;
    const zone = pile.dataset.zone;
    const index = zone === 'foundation'
      ? Number(pile.dataset.foundation)
      : Number(pile.dataset.column);
    if ((zone !== 'foundation' && zone !== 'tableau') || !this.#isValidTarget(zone, index)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.refs.board.querySelectorAll('.pile--drop').forEach((node) => {
      node.classList.remove('pile--drop');
    });
    pile.classList.add('pile--drop');
  };

  /**
   * @param {DragEvent} event
   * @returns {void}
   * @private
   */
  #onDragLeave = (event) => {
    const pile = event.target instanceof Element ? event.target.closest('.pile') : null;
    if (!pile) return;
    const related = event.relatedTarget;
    if (!(related instanceof Node) || !pile.contains(related)) {
      pile.classList.remove('pile--drop');
    }
  };

  /**
   * @param {DragEvent} event
   * @returns {void}
   * @private
   */
  #onDrop = (event) => {
    event.preventDefault();
    const pile = event.target instanceof Element ? event.target.closest('.pile') : null;
    if (this.refs.board) {
      this.refs.board.querySelectorAll('.pile--drop').forEach((node) => {
        node.classList.remove('pile--drop');
      });
    }
    if (!pile || !this.selection) return;
    const zone = pile.dataset.zone;
    if (zone !== 'foundation' && zone !== 'tableau') return;
    const index = zone === 'foundation'
      ? Number(pile.dataset.foundation)
      : Number(pile.dataset.column);
    if (!this.#isValidTarget(zone, index)) {
      this.#announce('Ese movimiento no es válido.', 'warn');
      this.#renderBoard();
      return;
    }
    this.#moveSelectionTo(zone, index);
  };

  /**
   * @returns {void}
   * @private
   */
  #onDragEnd = () => {
    if (!this.refs.board) return;
    this.refs.board.querySelectorAll('.pile--drop').forEach((node) => {
      node.classList.remove('pile--drop');
    });
  };

  /**
   * Atajos de teclado de la partida.
   *
   * @param {KeyboardEvent} event
   * @returns {void}
   * @private
   */
  #onKeyDown = (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const tag = event.target instanceof Element ? event.target.tagName : '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.modal-backdrop')) return;

    const key = event.key.toLowerCase();
    if (key === 'escape') {
      if (this.selection) {
        event.preventDefault();
        this.#clearSelection(true);
      }
      return;
    }
    if (key === 'd') {
      event.preventDefault();
      this.#draw();
    } else if (key === 'u') {
      event.preventDefault();
      this.#undo();
    } else if (key === 'y') {
      event.preventDefault();
      this.#redo();
    } else if (key === 'p') {
      event.preventDefault();
      this.#hint();
    } else if (key === 'a') {
      event.preventDefault();
      this.#autoComplete();
    } else if (key === 'i') {
      event.preventDefault();
      this.options.onInspect?.();
    }
  };
}
