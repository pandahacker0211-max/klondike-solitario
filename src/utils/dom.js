/**
 * Ayudas pequeñas para construir la interfaz sin frameworks.
 */

/**
 * Crea un elemento HTML.
 *
 * @param {string} tag Nombre de la etiqueta.
 * @param {Record<string, any>} [props] Clase, texto, dataset, eventos, etc.
 * @param {...any} children Hijos: nodos, textos, arreglos o valores nulos.
 * @returns {HTMLElement}
 */
export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class' || key === 'className') {
      node.className = String(value);
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        if (dataValue !== undefined && dataValue !== null) {
          node.dataset[dataKey] = String(dataValue);
        }
      }
    } else if (key === 'style' && value && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key === 'on' && value && typeof value === 'object') {
      for (const [event, handler] of Object.entries(value)) {
        if (typeof handler === 'function') node.addEventListener(event, handler);
      }
    } else if (key in node && typeof node[key] === 'boolean') {
      node[key] = Boolean(value);
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/**
 * Vacía un elemento.
 *
 * @param {HTMLElement} node
 * @returns {void}
 */
export function clear(node) {
  if (node) node.replaceChildren();
}

/**
 * Formatea una cantidad de segundos como `mm:ss` o `h:mm:ss`.
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value) => String(value).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Convierte una fecha ISO en un texto corto.
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
