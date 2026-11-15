import { h } from '../utils/dom.js';

/**
 * Administra una sola ventana modal a la vez.
 * Se encarga del fondo, del foco, de la tecla Escape y de restaurar el foco.
 */
export class ModalHost {
  /** @type {HTMLElement} */
  #root;
  /** @type {HTMLElement|null} */
  #backdrop = null;
  /** @type {HTMLElement|null} */
  #previousFocus = null;
  /** @type {(() => void)|null} */
  #onClose = null;
  /** @type {((event: KeyboardEvent) => void)|null} */
  #keyHandler = null;

  /**
   * @param {HTMLElement} root Contenedor donde se monta el modal.
   */
  constructor(root) {
    this.#root = root;
  }

  /**
   * @returns {boolean}
   */
  get isOpen() {
    return this.#backdrop !== null;
  }

  /**
   * Abre una ventana modal.
   *
   * @param {{
   *   title: string,
   *   subtitle?: string,
   *   body: Node|string,
   *   actions?: Array<{label: string, kind?: string, onClick?: () => void, close?: boolean}>,
   *   dismissible?: boolean,
   *   wide?: boolean,
   *   onClose?: () => void,
   * }} options
   * @returns {void}
   */
  open(options) {
    this.#removeSilently();

    const {
      title,
      subtitle = '',
      body,
      actions = [],
      dismissible = true,
      wide = false,
      onClose = null,
    } = options;

    this.#previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.#onClose = onClose;

    const titleId = `modal-title-${Date.now()}`;
    const closeButton = h('button', {
      class: 'modal__close',
      type: 'button',
      'aria-label': 'Cerrar',
      on: { click: () => this.close() },
    }, '×');

    const panel = h('div', {
      class: `modal${wide ? ' modal--wide' : ''}`,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
      tabindex: '-1',
    },
      h('header', { class: 'modal__header' },
        h('div', {},
          h('h2', { class: 'modal__title', id: titleId }, title),
          subtitle ? h('p', { class: 'modal__subtitle' }, subtitle) : null,
        ),
        dismissible ? closeButton : null,
      ),
      h('div', { class: 'modal__body' },
        body instanceof Node ? body : document.createTextNode(String(body)),
      ),
      actions.length > 0
        ? h('footer', { class: 'modal__footer' },
          ...actions.map((action) => h('button', {
            class: `button button--${action.kind ?? 'ghost'}`,
            type: 'button',
            on: {
              click: () => {
                if (action.onClick) action.onClick();
                if (action.close !== false) this.close();
              },
            },
          }, action.label)),
        )
        : null,
    );

    const backdrop = h('div', { class: 'modal-backdrop' }, panel);
    if (dismissible) {
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) this.close();
      });
    }

    this.#backdrop = backdrop;
    this.#root.append(backdrop);

    this.#keyHandler = (event) => {
      if (event.key === 'Escape' && dismissible) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = this.#focusable(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', this.#keyHandler, true);

    window.requestAnimationFrame(() => {
      const focusable = this.#focusable(panel);
      (focusable[0] ?? panel).focus();
    });
  }

  /**
   * Cierra la ventana modal actual.
   *
   * @returns {void}
   */
  close() {
    if (!this.#backdrop) return;
    this.#removeSilently();
    const callback = this.#onClose;
    this.#onClose = null;
    if (this.#previousFocus && document.contains(this.#previousFocus)) {
      this.#previousFocus.focus();
    }
    this.#previousFocus = null;
    if (callback) callback();
  }

  /**
   * @param {HTMLElement} panel
   * @returns {HTMLElement[]}
   * @private
   */
  #focusable(panel) {
    return Array.from(panel.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
  }

  /**
   * @returns {void}
   * @private
   */
  #removeSilently() {
    if (this.#keyHandler) {
      document.removeEventListener('keydown', this.#keyHandler, true);
      this.#keyHandler = null;
    }
    if (this.#backdrop) {
      this.#backdrop.remove();
      this.#backdrop = null;
    }
  }
}

/**
 * Construye una tarjeta de estadística para los modales.
 *
 * @param {string} label
 * @param {string|number} value
 * @returns {HTMLElement}
 */
export function statCard(label, value) {
  return h('div', { class: 'stat-card' },
    h('span', { class: 'stat-card__label' }, label),
    h('strong', { class: 'stat-card__value' }, value),
  );
}
