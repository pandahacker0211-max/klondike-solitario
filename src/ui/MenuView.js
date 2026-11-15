import { h } from '../utils/dom.js';

/**
 * Texto de la modalidad para mostrar en el menú y en los modales.
 *
 * @param {{drawCount: number, passLimit: number|string}} settings
 * @returns {string}
 */
export function describeMode(settings) {
  const draw = Number(settings.drawCount) === 3 ? 'Robo de 3 cartas' : 'Robo de 1 carta';
  const passes = settings.passLimit === 'infinite' || settings.passLimit === Infinity
    ? 'pases ilimitados'
    : `${settings.passLimit} pases`;
  return `${draw} · ${passes}`;
}

/**
 * Construye la pantalla del menú principal.
 *
 * @param {{
 *   settings: {drawCount: number, passLimit: number|string, playerName: string},
 *   best: {score: number, name: string}|null,
 *   onPlay: () => void,
 *   onLeaderboard: () => void,
 *   onHowTo: () => void,
 *   onSettings: () => void,
 *   onAbout: () => void,
 * }} options
 * @returns {HTMLElement}
 */
export function renderMenu(options) {
  const { settings, best, onPlay, onLeaderboard, onHowTo, onSettings, onAbout } = options;

  const secondary = (label, icon, handler) => h('button', {
    class: 'button button--ghost menu__secondary',
    type: 'button',
    on: { click: handler },
  },
    h('span', { class: 'menu__icon', 'aria-hidden': 'true' }, icon),
    label,
  );

  return h('main', { class: 'menu', dataset: { screen: 'menu' } },
    h('section', { class: 'menu__panel', 'aria-labelledby': 'menu-title' },
      h('p', { class: 'menu__eyebrow' }, 'Proyecto final · Estructuras de Datos'),
      h('h1', { class: 'menu__title', id: 'menu-title' }, 'Klondike'),
      h('p', { class: 'menu__suits', 'aria-hidden': 'true' },
        h('span', {}, '♠'), h('span', {}, '♥'), h('span', {}, '♦'), h('span', {}, '♣'),
      ),
      h('p', { class: 'menu__tagline' },
        'El solitario clásico, con pila, cola, lista circular, lista doblemente enlazada y árbol binario de búsqueda implementados desde cero.',
      ),
      h('div', { class: 'menu__buttons' },
        h('button', {
          class: 'button button--primary menu__play',
          type: 'button',
          on: { click: onPlay },
        }, 'Jugar'),
        h('div', { class: 'menu__grid' },
          secondary('Ranking', '🏆', onLeaderboard),
          secondary('Cómo jugar', '📖', onHowTo),
          secondary('Ajustes', '⚙️', onSettings),
          secondary('Estructuras', '🧩', onAbout),
        ),
      ),
      h('div', { class: 'menu__meta' },
        h('span', { class: 'tag' }, describeMode(settings)),
        h('span', { class: 'tag' }, `Jugador: ${settings.playerName}`),
      ),
      h('p', { class: 'menu__best' },
        best
          ? `Mejor puntaje: ${best.score} · ${best.name}`
          : 'Todavía no hay puntajes en el ranking.',
      ),
      h('footer', { class: 'menu__footer' },
        h('span', {}, 'Miguel Angel Vergara Morales'),
        h('span', { class: 'menu__dot', 'aria-hidden': 'true' }, '·'),
        h('span', {}, 'Danney Yuliana Medina Males'),
      ),
    ),
  );
}

/**
 * Contenido de la ventana «Cómo jugar».
 * Se reutiliza desde el menú y desde la partida.
 *
 * @returns {HTMLElement}
 */
export function buildRulesContent() {
  const scoreRow = (action, points) => h('tr', {},
    h('td', {}, action),
    h('td', { class: 'rules-table__points' }, points),
  );

  return h('div', { class: 'prose' },
    h('h3', {}, 'Objetivo'),
    h('p', {},
      'Mover las 52 cartas a las cuatro fundaciones. Cada fundación se arma con un solo palo, en orden ascendente: As, 2, 3… hasta el Rey.',
    ),

    h('h3', {}, 'Preparación'),
    h('p', {},
      'El tablero tiene siete columnas con 1, 2, 3, 4, 5, 6 y 7 cartas. Solo la carta superior de cada columna queda boca arriba; las demás están ocultas. Las 24 cartas restantes forman el mazo.',
    ),

    h('h3', {}, 'Cómo mover las cartas'),
    h('ul', {},
      h('li', {}, h('strong', {}, 'Mazo: '), 'haz clic para robar una o tres cartas, según los ajustes. Cuando el mazo se vacía, haz clic para reciclar el descarte.'),
      h('li', {}, h('strong', {}, 'Descarte: '), 'la carta superior puede ir a una fundación o a una columna del tablero.'),
      h('li', {}, h('strong', {}, 'Columnas: '), 'se construyen de forma descendente y alternando colores (rojo sobre negro o negro sobre rojo). Una columna vacía solo acepta un Rey.'),
      h('li', {}, h('strong', {}, 'Grupos: '), 'puedes mover una secuencia completa de cartas boca arriba de una columna a otra.'),
      h('li', {}, h('strong', {}, 'Fundaciones: '), 'solo aceptan la carta siguiente de su mismo palo, empezando por el As. También puedes devolver la carta superior de una fundación al tablero.'),
    ),

    h('h3', {}, 'Pases'),
    h('p', {},
      'Cada vez que el mazo se agota y reciclas el descarte consumes un pase. La partida puede configurarse con 3 pases (valor por defecto), 5 pases o pases ilimitados.',
    ),

    h('h3', {}, 'Puntaje'),
    h('table', { class: 'rules-table' },
      h('thead', {},
        h('tr', {}, h('th', { scope: 'col' }, 'Acción'), h('th', { scope: 'col' }, 'Puntos')),
      ),
      h('tbody', {},
        scoreRow('Mover una carta a una fundación', '+10'),
        scoreRow('Voltear una carta del tablero', '+5'),
        scoreRow('Devolver una carta de la fundación al tablero', '−15'),
        scoreRow('Reciclar el descarte', '−20'),
        scoreRow('Completar la partida', '+100'),
      ),
    ),
    h('p', { class: 'prose__note' }, 'El puntaje nunca baja de cero.'),

    h('h3', {}, 'Controles'),
    h('ul', { class: 'rules-controls' },
      h('li', {}, h('kbd', {}, 'Clic'), ' seleccionar una carta y luego hacer clic en el destino.'),
      h('li', {}, h('kbd', {}, 'Arrastrar'), ' soltar una carta o un grupo sobre otra columna o fundación.'),
      h('li', {}, h('kbd', {}, 'Doble clic'), ' enviar la carta superior a su fundación.'),
      h('li', {}, h('kbd', {}, 'D'), ' robar · ', h('kbd', {}, 'U'), ' deshacer · ', h('kbd', {}, 'Y'), ' rehacer.'),
      h('li', {}, h('kbd', {}, 'P'), ' pista · ', h('kbd', {}, 'A'), ' autocompletar · ', h('kbd', {}, 'I'), ' inspector de estructuras.'),
      h('li', {}, h('kbd', {}, 'Esc'), ' cancelar la selección.'),
    ),

    h('h3', {}, 'Fin de la partida'),
    h('ul', {},
      h('li', {}, h('strong', {}, 'Victoria: '), 'las 52 cartas están en las fundaciones.'),
      h('li', {}, h('strong', {}, 'Derrota: '), 'no quedan movimientos posibles, no hay cartas por robar y no quedan pases. También puedes rendirte desde el botón correspondiente.'),
      h('li', {}, 'Puedes deshacer movimientos con el botón ', h('em', {}, 'Deshacer'), ' o la tecla ', h('kbd', {}, 'U'), '.'),
    ),
  );
}

/**
 * Contenido de la ventana «Estructuras», útil para la sustentación.
 *
 * @returns {HTMLElement}
 */
export function buildAboutContent() {
  const item = (name, file, text) => h('li', { class: 'structure-item' },
    h('div', { class: 'structure-item__head' },
      h('strong', {}, name),
      h('code', {}, file),
    ),
    h('p', {}, text),
  );

  return h('div', { class: 'prose' },
    h('p', {},
      'Las cinco estructuras están implementadas desde cero con nodos y referencias. Los arreglos solo se usan para tareas auxiliares de la interfaz y para tomar fotografías del estado; el almacenamiento real de cada estructura son nodos enlazados.',
    ),
    h('ul', { class: 'structure-list' },
      item('Pila', 'src/structures/Stack.js',
        'LIFO con nodos enlazados. Se usa en el descarte, en cada fundación y en las pilas de deshacer y rehacer.'),
      item('Cola', 'src/structures/Queue.js',
        'FIFO con punteros al frente y al final. Representa el mazo de robo: las cartas se encolan al barajar y se desencolan al repartir o robar.'),
      item('Lista doblemente enlazada', 'src/structures/DoublyLinkedList.js',
        'Nodos con enlace anterior y siguiente. Cada una de las siete columnas del tablero es una lista doble; permite recorrerlas en ambos sentidos y separar grupos de cartas.'),
      item('Lista circular', 'src/structures/CircularList.js',
        'El último nodo apunta al primero y mantiene un cursor. Modela el ciclo de pases del mazo y avanza cada vez que se recicla el descarte.'),
      item('Árbol binario de búsqueda', 'src/structures/BST.js',
        'Inserta, busca y elimina por clave; incluye recorridos inorden, preorden y posorden. El ranking usa el puntaje como clave y poda el mínimo cuando supera los 10 registros.'),
    ),
    h('h3', {}, 'Cómo se relacionan con el juego'),
    h('ul', {},
      h('li', {}, 'El estado se captura en instantáneas planas para deshacer, rehacer y guardar la partida sin romper las estructuras.'),
      h('li', {}, 'Al cargar una instantánea, las pilas, colas y listas se reconstruyen con las cartas reales del registro.'),
      h('li', {}, 'El inspector de estructuras muestra el contenido y los recorridos en vivo durante una partida.'),
    ),
    h('p', { class: 'prose__note' },
      'Abre el inspector desde la partida con el botón «Estructuras» o la tecla I.',
    ),
  );
}
