/*
 * Exact (2,3,7) triangle-group quotient in PGL(2,F_7).
 * Integer residues only: never infer Coxeter relations from pixel geometry.
 * This file is an independent implementation, not copied from SymmHub or kq.py.
 */

const PRIME = 7;
const INVERSES = [null, 1, 4, 5, 2, 3, 6];
const ZERO = 0;
const IDENTITY = [1, 0, 0, 1];

function residue(value) {
  return ((value % PRIME) + PRIME) % PRIME;
}

export function projective(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 4 ||
      !matrix.every((value) => Number.isSafeInteger(value))) {
    throw new TypeError('a projective matrix has four integer entries');
  }
  const [a, b, c, d] = matrix.map(residue);
  if (residue(a * d - b * c) === ZERO) {
    throw new RangeError('singular matrix cannot represent a projective transformation');
  }
  const pivot = [a, b, c, d].find((value) => value !== ZERO);
  const inverse = INVERSES[pivot];
  return [a, b, c, d].map((value) => residue(value * inverse));
}

export const identity = projective(IDENTITY);

export function product(left, right) {
  const [a, b, c, d] = left;
  const [e, f, g, h] = right;
  return projective([
    a * e + b * g, a * f + b * h,
    c * e + d * g, c * f + d * h,
  ]);
}

export function inverse(matrix) {
  const [a, b, c, d] = matrix;
  return projective([d, -b, -c, a]);
}

export function matrixPower(matrix, exponent) {
  if (!Number.isSafeInteger(exponent) || exponent < 0) throw new RangeError('exponent must be a nonnegative integer');
  let result = identity;
  let base = matrix;
  let n = exponent;
  while (n > 0) {
    if (n % 2) result = product(result, base);
    base = product(base, base);
    n = Math.floor(n / 2);
  }
  return result;
}

export const key = (matrix) => matrix.join(',');

// U,V generate PSL(2,F7), projectively; D is a determinant-nonsquare involution.
export const U = projective([1, 1, 0, 1]);  // order 7
export const V = projective([0, -1, 1, 0]); // order 2 in PSL
export const D = projective([-1, 0, 0, 1]); // reflection conjugating U to U^-1

// Mirrors: r0=AB, r1=AC, r2=BC.
// r0*r1=V (order 2), r0*r2=V*U (order 3), r1*r2=U (order 7).
export const MIRRORS = [product(V, D), D, product(D, U)];

function generatedGroup(generators) {
  const found = new Map([[key(identity), identity]]);
  const queue = [identity];
  for (let index = 0; index < queue.length; index += 1) {
    for (const generator of generators) {
      const candidate = product(queue[index], generator);
      const candidateKey = key(candidate);
      if (!found.has(candidateKey)) {
        found.set(candidateKey, candidate);
        queue.push(candidate);
        if (found.size > 336) throw new Error('PGL2(F7) cannot exceed 336 elements');
      }
    }
  }
  return [...found.values()];
}

function isOrientationPreserving(matrix) {
  const [a, b, c, d] = matrix;
  // Multiplication by a projective scalar changes determinant by a square.
  return new Set([1, 2, 4]).has(residue(a * d - b * c));
}

function rightOrbits(elements, generator) {
  const byKey = new Map(elements.map((element) => [key(element), element]));
  const visited = new Set();
  const orbits = [];
  for (const element of elements) {
    if (visited.has(key(element))) continue;
    const orbit = [];
    let current = element;
    while (!visited.has(key(current))) {
      if (!byKey.has(key(current))) throw new Error('subgroup is not closed under the generator');
      visited.add(key(current));
      orbit.push(key(current));
      current = product(current, generator);
    }
    if (key(current) !== key(element)) throw new Error('orbit did not return to its start');
    orbits.push(orbit);
  }
  return orbits;
}

let cached = null;
export function kleinQuotient() {
  if (cached) return cached;
  const [r0, r1, r2] = MIRRORS;
  if (key(matrixPower(r0, 2)) !== key(identity) ||
      key(matrixPower(r1, 2)) !== key(identity) ||
      key(matrixPower(r2, 2)) !== key(identity) ||
      key(matrixPower(product(r0, r1), 2)) !== key(identity) ||
      key(matrixPower(product(r0, r2), 3)) !== key(identity) ||
      key(matrixPower(product(r1, r2), 7)) !== key(identity)) {
    throw new Error('the exact triangle-group presentation is violated');
  }

  const fullGroup = generatedGroup(MIRRORS);
  const orientationGroup = fullGroup.filter(isOrientationPreserving);
  const heptagonStabilizer = generatedGroup([r1, r2]);
  if (fullGroup.length !== 336 || orientationGroup.length !== 168 ||
      heptagonStabilizer.length !== 14) {
    throw new Error('unexpected PGL/PSL or heptagon stabilizer order');
  }

  // The 336 reflection chambers partition into 24 dihedral-14 right cosets.
  // The subgroup <r1,r2> fixes the angle-pi/7 vertex of the Schwarz triangle.
  const representative = (g) => heptagonStabilizer
    .map((h) => key(product(g, h)))
    .sort()[0];
  const sortedCosets = [...new Set(fullGroup.map(representative))].sort();
  const cosetNumber = new Map(sortedCosets.map((coset, index) => [coset, index]));
  const chamberToHeptagon = new Map(fullGroup.map((g) => [key(g), cosetNumber.get(representative(g))]));

  // An orientably regular map on 168 darts. Right multiplication by U
  // rotates faces; V reverses the directed edge; (VU)^-1 rotates vertices.
  // f ∘ e ∘ v = identity, so these cycles define a genuine oriented map.
  const faceCycles = rightOrbits(orientationGroup, U);
  const edgeCycles = rightOrbits(orientationGroup, V);
  const vertexCycles = rightOrbits(orientationGroup, inverse(product(V, U)));
  if (!faceCycles.every((orbit) => orbit.length === 7) ||
      !edgeCycles.every((orbit) => orbit.length === 2) ||
      !vertexCycles.every((orbit) => orbit.length === 3)) {
    throw new Error('the quotient is not a {7,3} orientable map');
  }
  const faces = faceCycles.length;
  const edges = edgeCycles.length;
  const vertices = vertexCycles.length;
  const eulerCharacteristic = vertices - edges + faces;
  const genus = (2 - eulerCharacteristic) / 2;
  if (sortedCosets.length !== 24 || faces !== 24 || edges !== 84 ||
      vertices !== 56 || genus !== 3) {
    throw new Error('Klein-quartic map checks failed');
  }
  cached = Object.freeze({
    mirrors: MIRRORS,
    fullGroup,
    orientationGroup,
    heptagonStabilizer,
    chamberToHeptagon,
    faceCycles,
    edgeCycles,
    vertexCycles,
    summary: Object.freeze({
      symbol: '*237',
      coxeterOrders: [[1, 2, 3], [2, 1, 7], [3, 7, 1]],
      fullReflectionQuotientOrder: 336,
      orientationPreservingOrder: 168,
      chamberCount: 336,
      heptagons: faces,
      edges,
      vertices,
      darts: orientationGroup.length,
      eulerCharacteristic,
      genus,
      areaOverPi: 8,
    }),
  });
  return cached;
}
