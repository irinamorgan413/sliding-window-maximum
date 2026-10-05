# Sliding Window Maximum

A tiny, dependency-free TypeScript/JavaScript library that tracks the maximum
value in a fixed-size sliding window over a stream of numbers. Backed by a
monotonic deque: every `push` is O(1) amortized.

## Install / use

ESM only. There is no build step.

```js
import { SlidingWindowMaximum } from 'sliding-window-maximum';

// Imperative: push values one at a time, read the current max whenever.
const sw = new SlidingWindowMaximum(3);
for (const v of [1, 3, -1, -3, 5, 3, 6, 7]) {
  console.log(sw.push(v));
  // 1, 3, 3, 3, 5, 5, 6, 7
}

// Batch helper: returns the window max after each element.
SlidingWindowMaximum.fromArray(3, [1, 3, -1, -3, 5, 3, 6, 7]);
// => [1, 3, 3, 3, 5, 5, 6, 7]
```

## API

`SlidingWindowMaximum` is the only export.

- `new SlidingWindowMaximum(windowSize)` — `windowSize` must be a non-negative
  integer. `0` is legal and means "no window": every `push` is a no-op and
  `max()` always returns `null`.
- `sw.push(value: number): number | null` — append one value, return the current
  window maximum, or `null` while the window is empty. Throws `TypeError` on
  `NaN` or non-number input; `Infinity` and `-Infinity` are accepted.
- `sw.max(): number | null` — read the current maximum without pushing.
- `sw.filled: number` — how many values are in the window right now (`0..size`).
- `sw.pushed: number` — total values pushed over the instance's lifetime.
- `sw.windowSize: number` — the size the instance was constructed with.
- `SlidingWindowMaximum.fromArray(windowSize, arr): (number | null)[]` — push
  every element of `arr` and return the per-step maxima.

## Why this exists

You have a stream of numbers and you want the running max of the last `k` of
them, without re-scanning the window on every value. The monotonic-deque trick
gives you O(1) amortized per push and O(n) total over `n` values, vs. O(n·k)
for the naive scan. The trade-off is memory: the deque holds at most `k`
indices, and you must be willing to store `k` metadata alongside the stream.

## The awkward edge

Equal values. A naive deque that keeps the older equal value around is correct
but stores redundant entries; one that replaces the older equal value with the
newer one is also correct and stays smaller. This library uses strict `<=` on
the back-pop, so a newer equal value replaces an older one: the deque is kept
strictly decreasing by value, which means the front is always the current max
and the deque never holds two equal-valued entries at once. If you assert on
internal deque length in your own code, expect at most one entry per distinct
value, not one per index.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

