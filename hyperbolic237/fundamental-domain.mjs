/*
 * An explicit connected chamber transversal for the torsion-free Klein-quartic
 * subgroup of the (2,3,7) reflection group, and its boundary pairings.
 *
 * Each of the 336 representatives is certified DISTINCT in the infinite group
 * by the faithful integral Tits representation. Exactly one representative
 * lies over each element of PGL2(F7). Selected chambers are joined when their
 * exact Tits matrices differ by one generator, not by rounding 2D points.
 *
 * This produces an 88-side (nonconvex) geometric fundamental polygon. Its
 * 44 boundary pairs are labelled by words IN THE KERNEL. A 12-gon obtained by
 * purely topological edge contractions would not be this geometric polygon.
 */
import { identity, key, MIRRORS, product, kleinQuotient } from './finite-quotient.mjs';
import { kleinSchwarzTriangle, reflectChamber, geodesicThrough, reflectAcross } from './geometry.mjs';
import {
  titsIdentity, TITS_MIRRORS, titsProduct, titsKey, titsEqual,
  titsInverseWord, titsWord,
} from './tits-representation.mjs';

const CORNER_OPPOSITE_SIDE = [2, 1, 0];
const COUNTERCLOCKWISE_SIDES = [0, 2, 1];
const CORNER_ORDERS = [2, 3, 7];

function halfedgeKey(chamber, side) { return `${chamber}:${side}`; }
function orientedSides(node) {
  return node.depth % 2 ? [...COUNTERCLOCKWISE_SIDES].reverse() : COUNTERCLOCKWISE_SIDES;
}
export function directedSideRoles(depth, side) {
  if (!Number.isInteger(side) || side < 0 || side > 2) throw new RangeError('invalid mirror side');
  const endpoints = [[0, 1], [2, 0], [1, 2]][side];
  return depth % 2 ? [...endpoints].reverse() : [...endpoints];
}

class DisjointSet {
  constructor(count) { this.parents = Array.from({ length: count }, (_, index) => index); }
  find(n) {
    if (this.parents[n] !== n) this.parents[n] = this.find(this.parents[n]);
    return this.parents[n];
  }
  join(a, b) { this.parents[this.find(a)] = this.find(b); }
  size() { return new Set(this.parents.map((_, n) => this.find(n))).size; }
  countByRole(chambers) {
    return CORNER_ORDERS.map((_, role) =>
      new Set(chambers.map((node) => this.find(3 * node.id + role))).size);
  }
}

function cornerUnion(chambers, neighboring, includeSide) {
  const ds = new DisjointSet(chambers.length * 3);
  for (const node of chambers) {
    for (let side = 0; side < 3; side += 1) {
      const neighbor = neighboring[node.id][side];
      if (!includeSide(node.id, side, neighbor)) continue;
      for (let corner = 0; corner < 3; corner += 1) {
        if (corner !== CORNER_OPPOSITE_SIDE[side]) {
          ds.join(3 * node.id + corner, 3 * neighbor + corner);
        }
      }
    }
  }
  return ds;
}

function collectBoundaryCycle(nodes, neighboring, internal) {
  const start = nodes.flatMap((node) => [0, 1, 2].map((side) => [node.id, side]))
    .find(([id, side]) => !internal[id][side]);
  if (!start) throw new Error('empty fundamental-domain boundary');
  const edges = [];
  const visited = new Set();
  let current = start;
  do {
    const [id, side] = current;
    const hkey = halfedgeKey(id, side);
    if (visited.has(hkey)) throw new Error('boundary walk encountered a premature cycle');
    visited.add(hkey);
    const [startRole, endRole] = directedSideRoles(nodes[id].depth, side);
    edges.push({
      index: edges.length, chamber: id, side,
      startRole, endRole,
      from: nodes[id].vertices[startRole], to: nodes[id].vertices[endRole],
    });
    let nextNode = id;
    let nextSide = side;
    let steps = 0;
    while (true) {
      const order = orientedSides(nodes[nextNode]);
      nextSide = order[(order.indexOf(nextSide) + 1) % 3];
      if (!internal[nextNode][nextSide]) break;
      nextNode = neighboring[nextNode][nextSide];
      if (++steps > 336 * 3) throw new Error('boundary traversal loop');
    }
    current = [nextNode, nextSide];
    if (edges.length > 1008) throw new Error('boundary cycle too long');
  } while (halfedgeKey(...current) !== halfedgeKey(...start));
  const expected = internal.reduce((sum, row) => sum + row.filter((inside) => !inside).length, 0);
  if (edges.length !== expected) throw new Error('chamber transversal has disconnected boundary');
  return edges;
}

export function hyperbolicDistance(first, second) {
  const [x, y] = first;
  const [u, v] = second;
  const norm1 = x * x + y * y;
  const norm2 = u * u + v * v;
  if (!(norm1 < 1 && norm2 < 1)) throw new RangeError('point is outside the open Poincare disk');
  const delta = (x - u) ** 2 + (y - v) ** 2;
  return Math.acosh(1 + (2 * delta) / ((1 - norm1) * (1 - norm2)));
}

export function applyMirrorWord(point, word) {
  // A word s0 s2 acts as the function s0(s2(point)), hence reverse order.
  const triangle = kleinSchwarzTriangle().vertices;
  const mirrors = [
    geodesicThrough(triangle[0], triangle[1]),
    geodesicThrough(triangle[0], triangle[2]),
    geodesicThrough(triangle[1], triangle[2]),
  ];
  let result = point;
  for (const generator of [...word].reverse()) {
    if (![0, 1, 2].includes(Number(generator))) throw new RangeError('unknown mirror');
    result = reflectAcross(mirrors[Number(generator)], result);
  }
  return result;
}

let cached;
export function kleinFundamentalPolygon() {
  if (cached) return cached;
  const quotient = kleinQuotient();
  const chambers = [{
    id: 0, finite: identity, tits: titsIdentity,
    word: '', depth: 0, parent: null, enteringSide: null,
    vertices: kleinSchwarzTriangle().vertices,
  }];
  const byFiniteKey = new Map([[key(identity), 0]]);
  for (let index = 0; index < chambers.length; index += 1) {
    const node = chambers[index];
    for (let side = 0; side < 3; side += 1) {
      const finite = product(node.finite, MIRRORS[side]);
      const fkey = key(finite);
      if (byFiniteKey.has(fkey)) continue;
      const id = chambers.length;
      chambers.push({
        id, finite, tits: titsProduct(node.tits, TITS_MIRRORS[side]),
        word: node.word + side, depth: node.depth + 1,
        parent: index, enteringSide: side,
        vertices: reflectChamber(node.vertices, side),
      });
      byFiniteKey.set(fkey, id);
    }
  }
  if (chambers.length !== quotient.fullGroup.length ||
      new Set(chambers.map((node) => titsKey(node.tits))).size !== chambers.length) {
    throw new Error('the Schreier representatives do not define 336 distinct chambers');
  }
  const neighboring = chambers.map((node) => [0, 1, 2].map((side) =>
    byFiniteKey.get(key(product(node.finite, MIRRORS[side])))));
  const internal = chambers.map((node) => [0, 1, 2].map((side) =>
    titsEqual(titsProduct(node.tits, TITS_MIRRORS[side]), chambers[neighboring[node.id][side]].tits)));
  for (const node of chambers) {
    for (let side = 0; side < 3; side += 1) {
      const neighbor = neighboring[node.id][side];
      if (neighbor === node.id || neighboring[neighbor][side] !== node.id ||
          internal[neighbor][side] !== internal[node.id][side]) {
        throw new Error('a chamber-side adjacency is not an involution');
      }
    }
  }
  const boundary = collectBoundaryCycle(chambers, neighboring, internal);
  const atBoundary = new Map(boundary.map((edge) => [halfedgeKey(edge.chamber, edge.side), edge.index]));
  const pairings = [];
  for (const edge of boundary) {
    const other = neighboring[edge.chamber][edge.side];
    const otherIndex = atBoundary.get(halfedgeKey(other, edge.side));
    if (otherIndex === undefined) throw new Error('missing side-pairing partner');
    if (edge.index > otherIndex) continue;
    const mate = boundary[otherIndex];
    if (edge.startRole !== mate.endRole || edge.endRole !== mate.startRole) {
      throw new Error('side-pairing is not orientation reversing');
    }
    // The map carries the selected representative of the mate chamber onto
    // the adjacent chamber outside this boundary: deck = (g s_i) (g')^-1.
    const deckWord = chambers[edge.chamber].word + edge.side +
      titsInverseWord(chambers[other].word).join('');
    const finiteDeck = [...deckWord].reduce((acc, letter) => product(acc, MIRRORS[Number(letter)]), identity);
    if (key(finiteDeck) !== key(identity) || deckWord.length % 2 !== 0 ||
        titsEqual(titsWord(deckWord), titsIdentity)) {
      throw new Error('the boundary identification is not a nontrivial orientation-preserving kernel element');
    }
    pairings.push({ first: edge.index, second: otherIndex, side: edge.side, deckWord });
  }
  const internalEdges = internal.flat().filter(Boolean).length / 2;
  const regionCorners = cornerUnion(chambers, neighboring, (a, s) => internal[a][s]);
  const quotientCorners = cornerUnion(chambers, neighboring, () => true);
  const regionVertices = regionCorners.size();
  const regionEdges = internalEdges + boundary.length;
  const regionEuler = regionVertices - regionEdges + chambers.length;
  const quotientVertices = quotientCorners.size();
  const quotientEdges = chambers.length * 3 / 2;
  const quotientEuler = quotientVertices - quotientEdges + chambers.length;
  const quotientGenus = (2 - quotientEuler) / 2;
  const cornerClasses = quotientCorners.countByRole(chambers);
  if (internalEdges !== 460 || boundary.length !== 88 || pairings.length !== 44 ||
      regionEuler !== 1 || quotientEuler !== -4 || quotientGenus !== 3 ||
      cornerClasses.join(',') !== '84,56,24') {
    throw new Error('fundamental polygon incidence checks failed');
  }
  cached = {
    chambers, neighboring, internal, boundary, pairings,
    summary: {
      symbol: '*237', chamberCount: 336, maxRepresentativeLength: Math.max(...chambers.map((n) => n.depth)),
      internalEdges, boundaryEdges: boundary.length, pairedBoundaryEdges: pairings.length,
      regionVertices, regionEdges, regionEuler,
      quotientVertices, quotientEdges, quotientFaces: chambers.length,
      quotientEuler, quotientGenus, cornerClasses,
      hyperbolicAreaOverPi: 8,
      proof: 'all group equality uses exact Tits matrices over Z[2cos(pi/7)]',
    },
  };
  return cached;
}
