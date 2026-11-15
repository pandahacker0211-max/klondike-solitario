import { SETTINGS_KEY, normalizeSettings } from '../config.js';
import { getStorage, loadJSON, saveJSON } from '../utils/storage.js';
import { h, formatTime } from '../utils/dom.js';
import { KlondikeGame } from '../game/KlondikeGame.js';
import { Leaderboard } from '../game/Leaderboard.js';
import { ModalHost, statCard } from './Modals.js';
import {
  renderMenu,
  buildRulesContent,
  buildAboutContent,
} from './MenuView.js';
import { renderLeaderboard } from './LeaderboardView.js';
import { GameView } from './GameView.js';
import { openStructuresModal } from './StructureInspector.js';

/**
 * Coordina las pantallas (menú, partida y ranking), los ajustes y los modales.
 */
export class App {
  /** @type {HTMLElement} */
  #root;
  /** @type {ModalHost} */
  #modal;
  /** @type {{getItem: Function, setItem: Function, removeItem: Function}} */
  #storage;
  /** @type {{drawCount: number, passLimit: number|string, playerName: string}} */
  #settings;
  /** @type {Leaderboard} */
  #leaderboard;
  /** @type {KlondikeGame|null} */
  #game = null;
  /** @type {GameView|null} */
  #gameView = null;
  /** @type {'menu'|'game'|'leaderboard'} */
  #screen = 'menu';
  /** @type {boolean} */
  #recorded = false;

  /**
   * @param {HTMLElement} root
   */
  constructor(root) {
    this.#root = root;
    this.#modal = new ModalHost(root);
    this.#storage = getStorage();

    const saved = loadJSON(this.#storage, SETTINGS_KEY, {});
    this.#settings = this.#normalizeSettings(saved && typeof saved === 'object' ? saved : {});
    this.#leaderboard = new Leaderboard({ storage: this.#storage });

    this.#showMenu();
  }

  // ------------------------------------------------------------ Pantallas

  /**
   * @returns {void}
   */
  #showMenu() {
    this.#teardownGame();
    this.#modal.close();
    this.#screen = 'menu';

    const best = this.#leaderboard.top(1)[0] ?? null;
    this.#root.replaceChildren(renderMenu({
      settings: this.#settings,
      best,
      onPlay: () => this.#startGame(),
      onLeaderboard: () => this.#showLeaderboard(),
      onHowTo: () => this.#showHowTo(),
      onSettings: () => this.#showSettings(),
      onAbout: () => this.#showAbout(),
    }));
  }

  /**
   * @returns {void}
   */
  #startGame() {
    this.#teardownGame();
    this.#modal.close();
    this.#screen = 'game';
    this.#recorded = false;

    this.#game = new KlondikeGame({
      drawCount: this.#settings.drawCount,
      passLimit: this.#settings.passLimit,
    });

    this.#gameView = new GameView(this.#game, {
      onMenu: () => this.#showMenu(),
      onHelp: () => this.#showHowTo(),
      onInspect: () => this.#showStructures(),
      onSurrender: () => this.#confirmSurrender(),
      onStatusChange: (status) => this.#handleStatus(status),
    });
    this.#gameView.mount(this.#root);
  }

  /**
   * @returns {void}
   */
  #showLeaderboard() {
    this.#teardownGame();
    this.#modal.close();
    this.#screen = 'leaderboard';

    this.#root.replaceChildren(renderLeaderboard({
      entries: this.#leaderboard.top(10),
      onBack: () => this.#showMenu(),
      onClear: () => this.#confirmClearRanking(),
      onPlay: () => this.#startGame(),
    }));
  }

  /**
   * Destruye la partida actual y libera sus temporizadores.
   *
   * @returns {void}
   */
  #teardownGame() {
    if (this.#gameView) {
      this.#gameView.destroy();
      this.#gameView = null;
    }
    this.#game = null;
  }

  // ------------------------------------------------------------ Modales

  /**
   * @returns {void}
   */
  #showHowTo() {
    this.#modal.open({
      title: 'Cómo jugar',
      subtitle: 'Reglas del Klondike',
      body: buildRulesContent(),
      wide: true,
      actions: [{ label: 'Entendido', kind: 'primary' }],
    });
  }

  /**
   * @returns {void}
   */
  #showAbout() {
    this.#modal.open({
      title: 'Estructuras del proyecto',
      subtitle: 'Cinco estructuras implementadas desde cero',
      body: buildAboutContent(),
      wide: true,
      actions: [{ label: 'Cerrar', kind: 'primary' }],
    });
  }

  /**
   * @returns {void}
   */
  #showStructures() {
    if (!this.#game) return;
    openStructuresModal(this.#modal, {
      game: this.#game,
      leaderboard: this.#leaderboard,
    });
  }

  /**
   * @returns {void}
   */
  #showSettings() {
    const select = (name, label, options, selectedValue) => h('label', { class: 'field' },
      h('span', { class: 'field__label' }, label),
      h('select', { class: 'field__input', name },
        ...options.map(([value, text]) => h('option', {
          value: String(value),
          selected: String(value) === String(selectedValue),
        }, text)),
      ),
    );

    const form = h('form', {
      class: 'settings-form',
      on: { submit: (event) => event.preventDefault() },
    },
    h('p', { class: 'settings-form__intro' },
      'Estos ajustes se guardan en este navegador. El nombre se usa al registrar un puntaje en el ranking.',
    ),
    h('label', { class: 'field' },
      h('span', { class: 'field__label' }, 'Nombre para el ranking'),
      h('input', {
        class: 'field__input',
        type: 'text',
        name: 'playerName',
        maxlength: '20',
        value: this.#settings.playerName,
        autocomplete: 'nickname',
      }),
    ),
    select('drawCount', 'Cartas por robo', [
      [1, '1 carta (clásico)'],
      [3, '3 cartas'],
    ], this.#settings.drawCount),
    select('passLimit', 'Pases del mazo', [
      [3, '3 pases'],
      [5, '5 pases'],
      ['infinite', 'Ilimitados'],
    ], this.#settings.passLimit),
    h('p', { class: 'field__hint' },
      'Los cambios de robo y pases se aplican a la próxima partida.'),
    );

    this.#modal.open({
      title: 'Ajustes',
      subtitle: 'Personaliza la partida',
      body: form,
      actions: [
        { label: 'Cancelar', kind: 'ghost' },
        {
          label: 'Guardar',
          kind: 'primary',
          onClick: () => {
            const data = new FormData(form);
            const next = this.#normalizeSettings({
              drawCount: Number(data.get('drawCount')),
              passLimit: data.get('passLimit'),
              playerName: data.get('playerName'),
            });
            this.#settings = next;
            saveJSON(this.#storage, SETTINGS_KEY, next);
            if (this.#screen === 'menu') this.#showMenu();
          },
        },
      ],
    });
  }

  /**
   * @returns {void}
   */
  #confirmSurrender() {
    if (!this.#game || this.#game.getStatus() !== 'playing') return;
    this.#modal.open({
      title: '¿Rendirse?',
      body: h('p', { class: 'game-over__lead' },
        'La partida terminará como derrota. Después puedes cerrar el resultado y usar Deshacer si cambias de opinión.',
      ),
      actions: [
        { label: 'Seguir jugando', kind: 'primary' },
        {
          label: 'Rendirse',
          kind: 'danger',
          close: false,
          onClick: () => {
            this.#modal.close();
            if (!this.#game) return;
            this.#game.surrender();
            this.#gameView?.refresh();
          },
        },
      ],
    });
  }

  // ------------------------------------------------------------ Fin de partida

  /**
   * @param {'playing'|'won'|'lost'} status
   * @returns {void}
   */
  #handleStatus(status) {
    if (status === 'playing') {
      this.#modal.close();
      return;
    }
    if (!this.#game) return;

    const game = this.#game;
    const snapshot = game.getSnapshot();
    let rankingNote = '';

    if (status === 'won') {
      if (this.#recorded) {
        rankingNote = 'Este puntaje ya estaba registrado en el ranking.';
      } else if (!this.#leaderboard.qualifies(snapshot.score)) {
        rankingNote = 'El puntaje no alcanzó el top 10 del ranking.';
        this.#recorded = true;
      } else {
        this.#recorded = true;
        const entry = this.#leaderboard.add({
          score: snapshot.score,
          name: this.#settings.playerName,
          mode: this.#modeLabel(game),
          time: game.getElapsedSeconds(),
          moves: snapshot.moves,
          date: new Date().toISOString(),
        });
        rankingNote = entry
          ? `Puntaje registrado en el ranking como ${this.#settings.playerName}.`
          : 'No se pudo guardar el puntaje en este navegador.';
      }
    }

    this.#showGameOver(status, game, snapshot, rankingNote);
  }

  /**
   * @param {'won'|'lost'} status
   * @param {KlondikeGame} game
   * @param {object} snapshot
   * @param {string} rankingNote
   * @returns {void}
   */
  #showGameOver(status, game, snapshot, rankingNote) {
    const won = status === 'won';
    const body = h('div', { class: 'game-over' },
      h('p', { class: 'game-over__lead' },
        won
          ? 'Completaste las cuatro fundaciones. ¡Buen trabajo!'
          : 'Ya no quedan movimientos posibles con las cartas y pases disponibles.',
      ),
      h('div', { class: 'stats-grid' },
        statCard('Puntaje', snapshot.score),
        statCard('Tiempo', formatTime(game.getElapsedSeconds())),
        statCard('Movimientos', snapshot.moves),
        statCard('Modalidad', this.#modeLabel(game)),
      ),
      won && rankingNote
        ? h('p', { class: 'game-over__note' }, rankingNote)
        : null,
      !won
        ? h('p', { class: 'game-over__note' },
          'Cierra esta ventana y usa Deshacer para volver al movimiento anterior.')
        : null,
      h('p', { class: 'game-over__seed' }, `Semilla: ${game.getSeed()}`),
    );

    this.#modal.open({
      title: won ? '¡Ganaste!' : 'Partida terminada',
      subtitle: won ? 'Klondike completado' : 'Sin movimientos disponibles',
      body,
      actions: [
        {
          label: 'Jugar otra vez',
          kind: 'primary',
          onClick: () => this.#startGame(),
        },
        {
          label: 'Ver ranking',
          onClick: () => this.#showLeaderboard(),
        },
        {
          label: 'Menú',
          onClick: () => this.#showMenu(),
        },
      ],
    });
  }

  /**
   * @returns {void}
   */
  #confirmClearRanking() {
    this.#modal.open({
      title: '¿Borrar el ranking?',
      body: h('p', { class: 'game-over__lead' },
        'Se eliminarán todos los puntajes guardados en este navegador. Esta acción no se puede deshacer.',
      ),
      actions: [
        { label: 'Cancelar', kind: 'primary' },
        {
          label: 'Borrar todo',
          kind: 'danger',
          onClick: () => {
            this.#leaderboard.clear();
            this.#showLeaderboard();
          },
        },
      ],
    });
  }

  // ------------------------------------------------------------ Utilidades

  /**
   * @param {KlondikeGame} game
   * @returns {string}
   */
  #modeLabel(game) {
    const draw = game.getDrawCount() === 3 ? 'Robo 3' : 'Robo 1';
    const limit = game.getPassLimit();
    const passes = limit === Infinity ? 'pases ∞' : `${limit} pases`;
    return `${draw} · ${passes}`;
  }

  /**
   * @param {object} raw
   * @returns {{drawCount: number, passLimit: number|string, playerName: string}}
   */
  #normalizeSettings(raw) {
    const base = normalizeSettings(raw);
    const name = String(raw?.playerName ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 20);
    return { ...base, playerName: name || 'Invitado' };
  }
}
