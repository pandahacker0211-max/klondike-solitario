/**
 * Runner de pruebas muy pequeño, sin dependencias.
 * Cada archivo de pruebas importa `test` y registra sus casos.
 */

const registered = [];

/**
 * Registra una prueba.
 *
 * @param {string} name
 * @param {() => void} fn
 * @returns {void}
 */
export function test(name, fn) {
  registered.push({ name, fn });
}

/**
 * Compara dos valores con igualdad profunda para arreglos y objetos planos.
 *
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 * @returns {void}
 */
export function assertEquals(actual, expected, message = '') {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${message}\nEsperado: ${expectedText}\nObtenido: ${actualText}`);
  }
}

/**
 * @param {boolean} value
 * @param {string} [message]
 * @returns {void}
 */
export function assertTrue(value, message = 'Se esperaba true.') {
  if (!value) throw new Error(message);
}

/**
 * @param {boolean} value
 * @param {string} [message]
 * @returns {void}
 */
export function assertFalse(value, message = 'Se esperaba false.') {
  if (value) throw new Error(message);
}

/**
 * @param {*} value
 * @param {string} [message]
 * @returns {void}
 */
export function assertNull(value, message = 'Se esperaba null.') {
  if (value !== null) throw new Error(message);
}

/**
 * Comprueba que una función lance una excepción.
 *
 * @param {() => void} fn
 * @param {Function} [type]
 * @param {string} [message]
 * @returns {void}
 */
export function assertThrows(fn, type = Error, message = 'Se esperaba una excepción.') {
  try {
    fn();
  } catch (error) {
    if (!(error instanceof type)) {
      throw new Error(`${message} Se lanzó ${error.constructor.name}.`);
    }
    return;
  }
  throw new Error(message);
}

/**
 * Ejecuta todas las pruebas y pinta el resultado en el contenedor.
 *
 * @param {HTMLElement} container
 * @returns {void}
 */
export function runTests(container) {
  const results = [];
  for (const item of registered) {
    try {
      item.fn();
      results.push({ name: item.name, ok: true });
    } catch (error) {
      results.push({ name: item.name, ok: false, error });
    }
  }

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  container.textContent = '';

  const summary = document.createElement('div');
  summary.className = `summary ${failed === 0 ? 'summary--ok' : 'summary--fail'}`;
  summary.textContent = `${passed} pruebas aprobadas · ${failed} fallidas · ${results.length} total`;
  container.appendChild(summary);

  const list = document.createElement('ol');
  list.className = 'results';
  for (const result of results) {
    const item = document.createElement('li');
    item.className = result.ok ? 'result result--ok' : 'result result--fail';
    const title = document.createElement('span');
    title.textContent = `${result.ok ? '✓' : '✗'} ${result.name}`;
    item.appendChild(title);
    if (!result.ok) {
      const detail = document.createElement('pre');
      detail.textContent = [
        result.error?.message || String(result.error),
        result.error?.stack || '',
      ].filter(Boolean).join('\n');
      item.appendChild(detail);
    }
    list.appendChild(item);
  }
  container.appendChild(list);
}
