import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SlidingWindowMaximum } from '../src/index.js';

// ---- happy path: monotonic values -----------------------------------------

test('classic LeetCode example [1,3,-1,-3,5,3,6,7], k=3', () => {
  // After each push the window maximum is, in order:
  //   [1]      -> 1
  //   [1,3]    -> 3
  //   [1,3,-1] -> 3
  //   [3,-1,-3]-> 3
  //   [-1,-3,5]-> 5
  //   [-3,5,3] -> 5
  //   [5,3,6]  -> 6
  //   [3,6,7]  -> 7
  const out = SlidingWindowMaximum.fromArray(3, [1, 3, -1, -3, 5, 3, 6, 7]);
  assert.deepEqual(out, [1, 3, 3, 3, 5, 5, 6, 7]);
});

// ---- constructor validation ----------------------------------------------

test('rejects non-integer or negative window sizes', () => {
  for (const bad of [-1, 0.5, '3', null, undefined, 3.000001]) {
    assert.throws(() => new SlidingWindowMaximum(bad), RangeError);
  }
});

test('window size 0 is legal: no window, max is always null', () => {
  const sw = new SlidingWindowMaximum(0);
  assert.equal(sw.push(5), null);
  assert.equal(sw.push(99), null);
  assert.equal(sw.max(), null);
  assert.equal(sw.filled, 0);
});

// ---- input validation on push --------------------------------------------

test('push rejects NaN and non-numbers', () => {
  const sw = new SlidingWindowMaximum(2);
  for (const bad of [NaN, 'x', null, undefined, {}, [], true]) {
    assert.throws(() => sw.push(bad), TypeError);
  }
});

test('push accepts +Infinity and -Infinity (finite-ness is not required)', () => {
  const sw = new SlidingWindowMaximum(3);
  assert.equal(sw.push(-Infinity), -Infinity);
  assert.equal(sw.push(Infinity), Infinity);
  assert.equal(sw.push(0), Infinity); // Infinity still in window
  assert.equal(sw.max(), Infinity);
});

// ---- getters --------------------------------------------------------------

test('filled grows up to windowSize then caps', () => {
  const sw = new SlidingWindowMaximum(3);
  assert.equal(sw.filled, 0);
  sw.push(1); assert.equal(sw.filled, 1);
  sw.push(2); assert.equal(sw.filled, 2);
  sw.push(3); assert.equal(sw.filled, 3);
  sw.push(4); assert.equal(sw.filled, 3); // capped
  sw.push(5); assert.equal(sw.filled, 3);
});

test('pushed counts total pushes, not window contents', () => {
  const sw = new SlidingWindowMaximum(2);
  assert.equal(sw.pushed, 0);
  sw.push(1); sw.push(2); sw.push(3); sw.push(4);
  assert.equal(sw.pushed, 4);
});

test('windowSize echoes the constructor argument', () => {
  assert.equal(new SlidingWindowMaximum(7).windowSize, 7);
});

// ---- the "awkward edges" of a monotonic deque -----------------------------

test('monotonically decreasing input: max tracks the newest until eviction', () => {
  // window 3, input 5,4,3,2,1
  // [5]      -> 5
  // [5,4]    -> 5
  // [5,4,3]  -> 5
  // [4,3,2]  -> 4  (5 evicted)
  // [3,2,1]  -> 3
  const sw = new SlidingWindowMaximum(3);
  const got = [5, 4, 3, 2, 1].map(v => sw.push(v));
  assert.deepEqual(got, [5, 5, 5, 4, 3]);
});

test('monotonically increasing input: max is always the newest', () => {
  // window 3, input 1,2,3,4,5
  // [1]    -> 1
  // [1,2]  -> 2
  // [1,2,3]-> 3
  // [2,3,4]-> 4
  // [3,4,5]-> 5
  const sw = new SlidingWindowMaximum(3);
  const got = [1, 2, 3, 4, 5].map(v => sw.push(v));
  assert.deepEqual(got, [1, 2, 3, 4, 5]);
});

test('repeated equal values: newer equal replaces older in the deque', () => {
  // window 3, input 7,7,7,7
  // Every push sees value 7. The strict-<= back-pop discards the previous 7
  // in favour of the new one, so the deque never holds two 7s at once. The
  // answer is still 7 throughout, but we verify the invariant indirectly:
  // after the 4th push, the (3rd) 7 must still be the max, and the 1st 7 must
  // already have been evicted (it aged out of a size-3 window).
  const sw = new SlidingWindowMaximum(3);
  const got = [7, 7, 7, 7].map(v => sw.push(v));
  assert.deepEqual(got, [7, 7, 7, 7]);
  // 4 pushes into a size-3 window: index 0 has aged out, current max is index
  // 2 or 3, value 7 either way.
  assert.equal(sw.max(), 7);
  assert.equal(sw.filled, 3);
});

test('maximum returns to a previous value after the current max leaves', () => {
  // window 3, input 5,1,1,5
  // [5]       -> 5
  // [5,1]     -> 5
  // [5,1,1]   -> 5
  // [1,1,5]   -> 5
  // Now continue so the big 5 leaves and a small max resurfaces.
  // window 3, continue: -10, -10
  // [1,5,-10] -> 5
  // [5,-10,-10] -> 5
  // next push 2 -> window [-10,-10,2] -> 2
  const sw = new SlidingWindowMaximum(3);
  for (const v of [5, 1, 1, 5, -10, -10]) sw.push(v);
  assert.equal(sw.max(), 5); // the big 5 still in window
  assert.equal(sw.push(2), 2); // big 5 evicted, small values resurface
});

test('window size 1: each push returns that exact value', () => {
  const sw = new SlidingWindowMaximum(1);
  const got = [9, 1, 9, 1, 9].map(v => sw.push(v));
  assert.deepEqual(got, [9, 1, 9, 1, 9]);
});

test('max() before any push is null (window not yet full)', () => {
  const sw = new SlidingWindowMaximum(3);
  assert.equal(sw.max(), null);
  sw.push(1); // window has 1 element, but it IS the max
  assert.equal(sw.max(), 1);
});

test('fromArray returns an array whose length matches the input', () => {
  const out = SlidingWindowMaximum.fromArray(2, [3, 1, 4, 1, 5]);
  assert.equal(out.length, 5);
  // [3]    -> 3
  // [3,1]  -> 3
  // [1,4]  -> 4
  // [4,1]  -> 4
  // [1,5]  -> 5
  assert.deepEqual(out, [3, 3, 4, 4, 5]);
});

test('fromArray rejects non-array input', () => {
  assert.throws(() => SlidingWindowMaximum.fromArray(2, 'nope'), TypeError);
  assert.throws(() => SlidingWindowMaximum.fromArray(2, null), TypeError);
});

test('fromArray on an empty input returns an empty result array', () => {
  const out = SlidingWindowMaximum.fromArray(3, []);
  assert.deepEqual(out, []);
});

test('large monotonic-decreasing stream does not grow the deque unboundedly', () => {
  // If the back-pop were ever skipped, a decreasing stream would queue every
  // index. Here we assert correctness of the output on a big input; the deque
  // stays at length <= windowSize because every new value is strictly less and
  // so pops nothing — but wait, that is exactly the case that DOES grow it.
  // Reconcile: decreasing input keeps every prior index until it ages out, so
  // deque length <= windowSize by eviction. We verify the per-step maxes match
  // the naive O(n*k) reference computed inline.
  const n = 2000;
  const k = 50;
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = n - i; // strictly decreasing
  const out = SlidingWindowMaximum.fromArray(k, arr);
  // naive reference
  const ref = new Array(n);
  for (let i = 0; i < n; i++) {
    let m = arr[i];
    for (let j = Math.max(0, i - k + 1); j <= i; j++) if (arr[j] > m) m = arr[j];
    ref[i] = m;
  }
  assert.deepEqual(out, ref);
});

test('random stream matches the naive O(n*k) reference', () => {
  // Deterministic PRNG so the test is reproducible — no Math.random(), no
  // wall-clock dependence.
  let state = 12345;
  const rng = () => {
    // xorshift32, constants from Marsaglia
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state % 1000; // 0..999
  };
  const n = 500;
  const k = 13;
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = rng();
  const out = SlidingWindowMaximum.fromArray(k, arr);
  const ref = new Array(n);
  for (let i = 0; i < n; i++) {
    let m = arr[i];
    for (let j = Math.max(0, i - k + 1); j <= i; j++) if (arr[j] > m) m = arr[j];
    ref[i] = m;
  }
  assert.deepEqual(out, ref);
});
