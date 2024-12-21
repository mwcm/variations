// Combinations function
export function combinations(iterable, r) {
  const pool = Array.from(iterable);
  const n = pool.length;
  if (r > n) return;
  const indices = Array(r).fill(0);
  yield indices.map(i => pool[i]);
  while (true) {
    let i;
    for (i = r - 1; i >= 0; i--) {
      if (indices[i] != i + n - r) {
        break;
      }
    }
    if (i < 0) return;
    indices[i]++;
    for (let j = i + 1; j < r; j++) {
      indices[j] = indices[j-1] + 1;
    }
    yield indices.map(i => pool[i]);
  }
}

// Product function
export function product(...iterables) {
  const pools = iterables.map(iter => Array.from(iter));
  const indices = Array(pools.length).fill(0);
  const result = indices.map((_, i) => pools[i][0]);
  yield result.slice();
  while (true) {
    let i;
    for (i = indices.length - 1; i >= 0; i--) {
      indices[i]++;
      if (indices[i] < pools[i].length) {
        break;
      }
      indices[i] = 0;
    }
    if (i < 0) return;
    for (let j = i; j < indices.length; j++) {
      result[j] = pools[j][indices[j]];
    }
    yield result.slice();
  }
}
