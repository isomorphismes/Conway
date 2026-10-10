/*
 * Faithful geometric (Tits) representation of the infinite Coxeter group
 * [2,3,7], over Z[t] / (t^3 - t^2 - 2t + 1), t = 2 cos(pi/7).
 *
 * Exact BigInt arithmetic: distinct chamber matrices remain distinct even
 * when the finite PGL(2,F7) quotient identifies them. Independent of pixels.
 *
 * Simple roots e0,e1,e2 have 2B(e0,e1)=0, 2B(e0,e2)=-1,
 * and 2B(e1,e2)=-t. Reflection s_i(v)=v-2B(v,e_i)e_i.
 */

const ZERO = [0n, 0n, 0n];
const ONE = [1n, 0n, 0n];
const NEGATIVE_ONE = [-1n, 0n, 0n];
const T = [0n, 1n, 0n];

const add = (x, y) => x.map((a, i) => a + y[i]);
function multiply(x, y) {
  const [a, b, c] = x;
  const [d, e, f] = y;
  const coefficient3 = b * f + c * e;
  const coefficient4 = c * f;
  return [
    a * d - coefficient3 - coefficient4,
    a * e + b * d + 2n * coefficient3 + coefficient4,
    a * f + b * e + c * d + coefficient3 + 3n * coefficient4,
  ];
}

const int = (n) => [BigInt(n), 0n, 0n];
export const titsIdentity = [
  [ONE, ZERO, ZERO],
  [ZERO, ONE, ZERO],
  [ZERO, ZERO, ONE],
];

export const TITS_MIRRORS = [
  [[NEGATIVE_ONE, ZERO, ONE], [ZERO, ONE, ZERO], [ZERO, ZERO, ONE]],
  [[ONE, ZERO, ZERO], [ZERO, NEGATIVE_ONE, T], [ZERO, ZERO, ONE]],
  [[ONE, ZERO, ZERO], [ZERO, ONE, ZERO], [ONE, T, NEGATIVE_ONE]],
];

export function titsProduct(left, right) {
  return Array.from({ length: 3 }, (_, i) =>
    Array.from({ length: 3 }, (_, j) => {
      let value = ZERO;
      for (let k = 0; k < 3; k += 1) {
        value = add(value, multiply(left[i][k], right[k][j]));
      }
      return value;
    }));
}

export function titsKey(matrix) {
  return matrix.map((row) => row.map((entry) => entry.join(',')).join(';')).join('|');
}

export function titsWord(word) {
  let value = titsIdentity;
  for (const generator of word) {
    const index = Number(generator);
    if (!Number.isInteger(index) || index < 0 || index >= 3) {
      throw new RangeError('a Coxeter word must contain only mirror indices 0, 1, 2');
    }
    value = titsProduct(value, TITS_MIRRORS[index]);
  }
  return value;
}

export function titsPower(matrix, exponent) {
  if (!Number.isSafeInteger(exponent) || exponent < 0) throw new RangeError('exponent must be nonnegative');
  let result = titsIdentity;
  for (let i = 0; i < exponent; i += 1) result = titsProduct(result, matrix);
  return result;
}

// Keep exported operations small. This is an equality oracle, not a reducer:
// preserving an exact matrix does not produce a minimal word or proof ledger.
export function titsEqual(left, right) {
  return titsKey(left) === titsKey(right);
}

export function titsInverseWord(word) {
  return [...word].reverse(); // every Coxeter generator is an involution
}

export const algebraicParameter = Object.freeze({
  name: '2*cos(pi/7)',
  minimalPolynomial: 't^3-t^2-2*t+1',
});
