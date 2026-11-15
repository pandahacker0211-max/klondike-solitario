import { h } from '../utils/dom.js';

/**
 * Bloque desplegable del inspector.
 *
 * @param {string} title
 * @param {string} tag
 * @param {...Node} content
 * @returns {HTMLElement}
 */
function block(title, tag, ...content) {
  return h('details', { class: 'structures__block', open: true },
    h('summary', { class: 'structures__summary' },
      h('strong', {}, title),
      h('span', { class: 'tag' }, tag),
    ),
    h('div', { class: 'structures__content' }, ...content),
  );
}

/**
 * @param {string[]} items
 * @param {string} [emptyText]
 * @returns {HTMLElement}
 */
function itemsLine(items, emptyText = 'Vacía') {
  return h('p', { class: 'structures__items' }, items.length > 0 ? items.join(' · ') : emptyText);
}

/**
 * Abre el inspector en vivo de las estructuras del juego.
 *
 * @param {import('./Modals.js').ModalHost} modal
 * @param {{
 *   game: import('../game/KlondikeGame.js').KlondikeGame,
 *   leaderboard: import('../game/Leaderboard.js').Leaderboard,
 * }} options
 * @returns {void}
 */
export function openStructuresModal(modal, options) {
  const { game, leaderboard } = options;
  const info = game.getDebugInfo();
  const ranking = leaderboard.getDebugInfo();

  const foundations = info.foundations.map((pile, index) => h('p', { class: 'structures__line' },
    h('span', { class: 'structures__key' }, `${pile.suit} Fundación ${index + 1}`),
    h('span', { class: 'structures__value' },
      `${pile.size} cartas${pile.top ? ` · tope ${pile.top}` : ''}`),
    h('code', { class: 'structures__items' }, pile.items.join(' · ') || 'vacía'),
  ));

  const columns = info.tableau.map((column) => h('p', { class: 'structures__line' },
    h('span', { class: 'structures__key' }, `Columna ${column.index}`),
    h('span', { class: 'structures__value' }, `${column.size} cartas`),
    h('code', { class: 'structures__items' },
      column.forward.length > 0 ? column.forward.join(' → ') : 'vacía'),
    h('span', { class: 'structures__muted' },
      column.backward.length > 0 ? `reversa: ${column.backward.join(' ← ')}` : ''),
  ));

  const body = h('div', { class: 'structures' },
    h('p', { class: 'structures__intro' },
      'Contenido real de las estructuras en este instante. Las cartas se muestran con su etiqueta y palo; los recorridos permiten comprobar el orden interno.',
    ),
    h('div', { class: 'structures__grid' },
      block('Cola · Mazo de robo', `FIFO · ${info.stock.size}`,
        h('p', { class: 'structures__line' },
          h('span', { class: 'structures__key' }, 'Frente'),
          h('code', {}, info.stock.front ?? '—'),
        ),
        itemsLine(info.stock.items, 'Mazo vacío'),
        h('p', { class: 'structures__hint' }, 'Se desencola desde el frente al robar.'),
      ),

      block('Pila · Descarte', `LIFO · ${info.waste.size}`,
        h('p', { class: 'structures__line' },
          h('span', { class: 'structures__key' }, 'Tope'),
          h('code', {}, info.waste.top ?? '—'),
        ),
        itemsLine(info.waste.items, 'Descarte vacío'),
        h('p', { class: 'structures__hint' }, 'Solo la carta del tope puede seleccionarse.'),
      ),

      block('Pilas · Fundaciones', `4 pilas · ${info.foundations.reduce((sum, pile) => sum + pile.size, 0)} cartas`,
        ...foundations,
        h('p', { class: 'structures__hint' }, 'Cada fundación es una pila independiente, de As a Rey.'),
      ),

      block('Lista doblemente enlazada · Columnas', `7 listas`,
        ...columns,
        h('p', { class: 'structures__hint' }, 'Cada columna se recorre hacia adelante y hacia atrás; los grupos se separan con splitFrom.'),
      ),

      block('Lista circular · Pases', `${info.passes.size} nodos`,
        h('p', { class: 'structures__line' },
          h('span', { class: 'structures__key' }, 'Cursor'),
          h('code', {}, String(info.passes.current ?? '—')),
        ),
        itemsLine(info.passes.items.map(String), 'Sin pases'),
        h('p', { class: 'structures__hint' }, 'El cursor avanza al reciclar el descarte; el último nodo apunta al primero.'),
      ),

      block('Árbol binario de búsqueda · Ranking', `${ranking.size} registros`,
        h('p', { class: 'structures__line' },
          h('span', { class: 'structures__key' }, 'Inorden (ascendente)'),
        ),
        itemsLine(ranking.inOrder, 'Ranking vacío'),
        h('p', { class: 'structures__line' },
          h('span', { class: 'structures__key' }, 'Preorden'),
        ),
        itemsLine(ranking.preOrder, '—'),
        h('p', { class: 'structures__line' },
          h('span', { class: 'structures__key' }, 'Posorden'),
        ),
        itemsLine(ranking.postOrder, '—'),
        h('p', { class: 'structures__hint' }, 'La clave es el puntaje. El ranking visible invierte el inorden para mostrar de mayor a menor.'),
      ),
    ),
    h('div', { class: 'structures__footer' },
      h('span', { class: 'tag' }, `Deshacer: ${info.undo}`),
      h('span', { class: 'tag' }, `Rehacer: ${info.redo}`),
      h('span', { class: 'structures__hint' }, 'Estas dos pilas guardan instantáneas del estado.'),
    ),
  );

  modal.open({
    title: 'Inspector de estructuras',
    subtitle: 'Datos en vivo de la partida actual',
    body,
    wide: true,
    actions: [{ label: 'Cerrar', kind: 'primary' }],
  });
}
