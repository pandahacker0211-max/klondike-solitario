import { App } from './ui/App.js';

/**
 * Punto de entrada del juego.
 * Monta la aplicación sobre el contenedor #app declarado en index.html.
 */
const root = document.getElementById('app');

if (!root) {
  throw new Error('No se encontró el contenedor #app.');
}

new App(root);
