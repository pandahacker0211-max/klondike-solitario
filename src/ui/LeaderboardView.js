import { h, formatTime, formatDate } from '../utils/dom.js';

/**
 * Construye la pantalla del ranking de mejores puntajes.
 *
 * @param {{
 *   entries: Array<{score: number, name: string, mode: string, time: number, moves: number, date: string}>,
 *   onBack: () => void,
 *   onClear: () => void,
 *   onPlay: () => void,
 * }} options
 * @returns {HTMLElement}
 */
export function renderLeaderboard(options) {
  const { entries, onBack, onClear, onPlay } = options;

  const header = h('header', { class: 'page__header' },
    h('button', {
      class: 'button button--ghost button--small',
      type: 'button',
      on: { click: onBack },
    }, '← Volver al menú'),
    h('div', { class: 'page__heading' },
      h('p', { class: 'page__eyebrow' }, 'Los mejores resultados'),
      h('h1', { class: 'page__title' }, 'Ranking'),
    ),
    entries.length > 0
      ? h('button', {
        class: 'button button--ghost button--small',
        type: 'button',
        on: { click: onClear },
      }, 'Borrar ranking')
      : h('span', { class: 'page__spacer' }),
  );

  let content;
  if (entries.length === 0) {
    content = h('div', { class: 'empty-state' },
      h('span', { class: 'empty-state__icon', 'aria-hidden': 'true' }, '🏆'),
      h('h2', {}, 'Todavía no hay puntajes'),
      h('p', {}, 'Gana una partida para aparecer en el ranking. Los puntajes se guardan en este navegador.'),
      h('button', {
        class: 'button button--primary',
        type: 'button',
        on: { click: onPlay },
      }, 'Jugar una partida'),
    );
  } else {
    const rows = entries.map((entry, index) => h('tr', { class: index < 3 ? `rank rank--${index + 1}` : '' },
      h('td', { class: 'rank__position' },
        index < 3
          ? h('span', { class: 'rank__medal', 'aria-label': `${index + 1}º lugar` }, ['🥇', '🥈', '🥉'][index])
          : `${index + 1}º`,
      ),
      h('td', { class: 'rank__name' }, entry.name),
      h('td', { class: 'rank__score' }, entry.score),
      h('td', {}, entry.mode),
      h('td', {}, formatTime(entry.time)),
      h('td', {}, entry.moves),
      h('td', {}, formatDate(entry.date)),
    ));

    content = h('div', { class: 'table-wrap' },
      h('table', { class: 'ranking-table' },
        h('caption', { class: 'sr-only' }, 'Mejores puntajes del juego'),
        h('thead', {},
          h('tr', {},
            h('th', { scope: 'col' }, 'Lugar'),
            h('th', { scope: 'col' }, 'Jugador'),
            h('th', { scope: 'col' }, 'Puntaje'),
            h('th', { scope: 'col' }, 'Modalidad'),
            h('th', { scope: 'col' }, 'Tiempo'),
            h('th', { scope: 'col' }, 'Movimientos'),
            h('th', { scope: 'col' }, 'Fecha'),
          ),
        ),
        h('tbody', {}, ...rows),
      ),
    );
  }

  return h('main', { class: 'page', dataset: { screen: 'leaderboard' } },
    h('div', { class: 'page__panel' },
      header,
      content,
    ),
  );
}
