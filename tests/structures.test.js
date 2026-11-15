import { test, assertEquals, assertTrue, assertFalse, assertNull, assertThrows } from './test-runner.js';
import { Stack } from '../src/structures/Stack.js';
import { Queue } from '../src/structures/Queue.js';
import { DoublyLinkedList } from '../src/structures/DoublyLinkedList.js';
import { CircularList } from '../src/structures/CircularList.js';
import { BST } from '../src/structures/BST.js';

// ---------------------------------------------------------------- Pila
test('Pila: apilar, ver tope y tamaño', () => {
  const stack = new Stack();
  assertTrue(stack.isEmpty());
  stack.push('A').push('B').push('C');
  assertEquals(stack.size(), 3);
  assertEquals(stack.peek(), 'C');
  assertEquals(stack.toArray(), ['A', 'B', 'C']);
});

test('Pila: desapilar respeta LIFO', () => {
  const stack = new Stack();
  stack.push(1).push(2).push(3);
  assertEquals(stack.pop(), 3);
  assertEquals(stack.pop(), 2);
  assertEquals(stack.size(), 1);
  assertEquals(stack.pop(), 1);
  assertTrue(stack.isEmpty());
  assertNull(stack.pop());
  assertNull(stack.peek());
});

test('Pila: clear y toArray', () => {
  const stack = new Stack();
  stack.push('x').push('y');
  stack.clear();
  assertTrue(stack.isEmpty());
  assertEquals(stack.size(), 0);
  assertEquals(stack.toArray(), []);
});

// ---------------------------------------------------------------- Cola
test('Cola: encolar, ver frente y tamaño', () => {
  const queue = new Queue();
  assertTrue(queue.isEmpty());
  queue.enqueue('A').enqueue('B').enqueue('C');
  assertEquals(queue.size(), 3);
  assertEquals(queue.front(), 'A');
  assertEquals(queue.toArray(), ['A', 'B', 'C']);
});

test('Cola: desencolar respeta FIFO', () => {
  const queue = new Queue();
  queue.enqueue(1).enqueue(2);
  assertEquals(queue.dequeue(), 1);
  assertEquals(queue.front(), 2);
  assertEquals(queue.dequeue(), 2);
  assertTrue(queue.isEmpty());
  assertNull(queue.dequeue());
});

test('Cola: clear', () => {
  const queue = new Queue();
  queue.enqueue('a');
  queue.clear();
  assertTrue(queue.isEmpty());
  assertEquals(queue.toArray(), []);
});

// ------------------------------------------------- Lista doblemente enlazada
test('Lista doble: insertar al inicio, final y posición', () => {
  const list = new DoublyLinkedList();
  list.insertAtEnd('B').insertAtStart('A').insertAt(1, 'X');
  assertEquals(list.toArray(), ['A', 'X', 'B']);
  assertEquals(list.size(), 3);
  assertEquals(list.get(2), 'B');
  assertNull(list.get(99));
});

test('Lista doble: recorrer en ambos sentidos', () => {
  const list = new DoublyLinkedList();
  list.insertAtEnd(1).insertAtEnd(2).insertAtEnd(3);
  const forward = [];
  const backward = [];
  list.traverseForward((value) => forward.push(value));
  list.traverseBackward((value) => backward.push(value));
  assertEquals(forward, [1, 2, 3]);
  assertEquals(backward, [3, 2, 1]);
});

test('Lista doble: buscar, eliminar y eliminar por posición', () => {
  const list = new DoublyLinkedList();
  const a = { id: 'a' };
  const b = { id: 'b' };
  const c = { id: 'c' };
  list.insertAtEnd(a).insertAtEnd(b).insertAtEnd(c);
  assertEquals(list.search(b), 1);
  assertEquals(list.search({ id: 'b' }), -1);
  assertTrue(list.remove(b));
  assertEquals(list.toArray(), [a, c]);
  assertEquals(list.removeAt(0), a);
  assertEquals(list.toArray(), [c]);
  assertEquals(list.removeAt(0), c);
  assertTrue(list.isEmpty());
});

test('Lista doble: splitFrom divide y conserva el orden', () => {
  const list = new DoublyLinkedList();
  list.insertAtEnd('A').insertAtEnd('B').insertAtEnd('C').insertAtEnd('D');
  const tail = list.splitFrom(2);
  assertEquals(list.toArray(), ['A', 'B']);
  assertEquals(tail.toArray(), ['C', 'D']);
  assertEquals(tail.size(), 2);
  assertEquals(list.size(), 2);
});

test('Lista doble: posiciones inválidas lanzan RangeError', () => {
  const list = new DoublyLinkedList();
  assertThrows(() => list.insertAt(1, 'x'), RangeError);
  assertThrows(() => list.removeAt(0), RangeError);
  assertThrows(() => list.splitFrom(1), RangeError);
});

// ---------------------------------------------------------------- Circular
test('Lista circular: insertar, recorrer y buscar', () => {
  const list = new CircularList();
  list.insertAtEnd(1).insertAtEnd(2).insertAtEnd(3);
  const values = [];
  list.traverse((value) => values.push(value));
  assertEquals(values, [1, 2, 3]);
  assertEquals(list.search(2), 1);
  assertEquals(list.search(99), -1);
  assertEquals(list.get(2), 3);
});

test('Lista circular: advance da la vuelta', () => {
  const list = new CircularList();
  list.insertAtEnd('A').insertAtEnd('B').insertAtEnd('C');
  assertEquals(list.current(), 'A');
  assertEquals(list.advance(), 'B');
  assertEquals(list.advance(), 'C');
  assertEquals(list.advance(), 'A');
  assertEquals(list.current(), 'A');
});

test('Lista circular: insertar en posición y eliminar', () => {
  const list = new CircularList();
  list.insertAtEnd(1).insertAtEnd(3);
  list.insertAt(1, 2);
  assertEquals(list.toArray(), [1, 2, 3]);
  assertTrue(list.remove(2));
  assertEquals(list.toArray(), [1, 3]);
  assertEquals(list.removeAt(0), 1);
  assertEquals(list.toArray(), [3]);
  assertTrue(list.remove(3));
  assertTrue(list.isEmpty());
  assertNull(list.advance());
});

// ---------------------------------------------------------------- BST
test('BST: insertar, buscar y recorridos', () => {
  const tree = new BST();
  tree.insert(50, 'cincuenta').insert(30, 'treinta').insert(70, 'setenta');
  tree.insert(20, 'veinte').insert(40, 'cuarenta').insert(60, 'sesenta').insert(80, 'ochenta');
  assertEquals(tree.size(), 7);
  assertEquals(tree.search(40), 'cuarenta');
  assertNull(tree.search(99));
  const inOrder = tree.toArray('in').map((item) => item.key);
  const preOrder = tree.toArray('pre').map((item) => item.key);
  const postOrder = tree.toArray('post').map((item) => item.key);
  assertEquals(inOrder, [20, 30, 40, 50, 60, 70, 80]);
  assertEquals(preOrder, [50, 30, 20, 40, 70, 60, 80]);
  assertEquals(postOrder, [20, 40, 30, 60, 80, 70, 50]);
});

test('BST: mínimo, máximo y altura', () => {
  const tree = new BST();
  assertNull(tree.minEntry());
  assertNull(tree.maxEntry());
  tree.insert(10, 'a').insert(5, 'b').insert(15, 'c').insert(2, 'd');
  assertEquals(tree.minEntry().key, 2);
  assertEquals(tree.maxEntry().key, 15);
  assertEquals(tree.height(), 3);
});

test('BST: eliminar hoja, un hijo y dos hijos', () => {
  const tree = new BST();
  tree.insert(50, 'a').insert(30, 'b').insert(70, 'c').insert(20, 'd').insert(40, 'e');
  assertTrue(tree.delete(20));
  assertEquals(tree.search(20), null);
  assertTrue(tree.delete(30));
  assertEquals(tree.search(30), null);
  assertTrue(tree.delete(50));
  assertEquals(tree.search(50), null);
  assertFalse(tree.delete(999));
  assertEquals(tree.size(), 2);
});

test('BST: claves repetidas y clear', () => {
  const tree = new BST();
  tree.insert(10, 'a').insert(10, 'b').insert(10, 'c');
  assertEquals(tree.size(), 3);
  assertTrue(tree.delete(10));
  assertEquals(tree.size(), 2);
  tree.clear();
  assertTrue(tree.isEmpty());
  assertEquals(tree.toArray(), []);
});
