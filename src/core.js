/**
 * Tracks the maximum value in a fixed-size sliding window over a data stream.
 *
 * Algorithm: monotonic deque.
 * - front of the deque holds the index of the current window maximum
 * - on each push, pop back indices whose values <= incoming value so the deque
 *   stays strictly decreasing by value (ties broken by recency)
 * - pop front when its index falls outside the window
 *
 * Why strict `<=` on the back-pop: a newer equal value is at least as good a
 * maximum as an older one and survives longer in the window, so keeping the
 * older one adds a redundant eviction without changing the answer.
 *
 * WHY a class instead of a generator: a generator consumes the input and
 * emits one max per element. Callers that want to interleave pushes with reads
 * of the current max (push; maybe read; maybe push twice) need stateful access.
 * The class exposes both imperative `push` and a batch `fromArray` helper.
 */
export class SlidingWindowMaximum {
  /** @type {number[]} indices into the virtual stream, front = current max */
  #deque;
  /** @type {number} count of values pushed so far (also the next index) */
  #count;
  /** @type {number} window size, must be >= 0 */
  #size;

  /**
   * @param {number} windowSize  Non-negative integer. 0 means "no window": every
   *                            `push` is a no-op and `max` always returns null.
   */
  constructor(windowSize) {
    if (!Number.isInteger(windowSize) || windowSize < 0) {
      throw new RangeError('windowSize must be a non-negative integer');
    }
    this.#size = windowSize;
    this.#deque = [];
    this.#count = 0;
  }

  /** Number of values currently inside the window (0..size). */
  get filled() {
    return Math.min(this.#count, this.#size);
  }

  /** Number of values pushed over the lifetime of this instance. */
  get pushed() {
    return this.#count;
  }

  /** Window size this instance was constructed with. */
  get windowSize() {
    return this.#size;
  }

  /**
   * Push one value into the window. O(1) amortized — each index enters and
   * leaves the deque at most once.
   *
   * @param {number} value
   * @returns {number|null} current window maximum, or null when the window is
   *                        empty (size 0 or fewer than size values seen).
   */
  push(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError('value must be a finite number');
    }
    const idx = this.#count;
    this.#count += 1;
    if (this.#size === 0) return null;

    // Drop indices whose values can never be the max while the new value is
    // present. Strict `<=` so equal-but-newer replaces equal-but-older.
    while (this.#deque.length > 0 && this.#deque[this.#deque.length - 1].value <= value) {
      this.#deque.pop();
    }
    this.#deque.push({ index: idx, value });

    // Evict the front if it has aged out of the window.
    const first = this.#deque[0];
    if (first.index <= idx - this.#size) {
      this.#deque.shift();
    }
    return this.#deque[0].value;
  }

  /**
   * Current window maximum without pushing.
   * @returns {number|null}
   */
  max() {
    if (this.#size === 0 || this.#count === 0) return null;
    return this.#deque[0].value;
  }

  /**
   * Batch helper: push every element of `arr` and return the max after each
n   * push (or null while the window is still empty).
   * @param {number[]} arr
   * @returns {(number|null)[]}
   */
  static fromArray(windowSize, arr) {
    if (!Array.isArray(arr)) throw new TypeError('arr must be an array');
    const sw = new SlidingWindowMaximum(windowSize);
    const out = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) out[i] = sw.push(arr[i]);
    return out;
  }
}
