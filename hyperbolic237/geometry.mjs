/*
 * Numerically constructed Schwarz triangle and its Poincare-disk reflections.
 * This is a drawing model, not an exact-equality oracle for the Coxeter group.
 * The independent finite-field model is in finite-quotient.mjs.
 */
import { identity, key, MIRRORS, product } from './finite-quotient.mjs';

const ANGLES = [Math.PI / 2, Math.PI / 3, Math.PI / 7];
const EPSILON = 1e-12;

export function kleinSchwarzTriangle() {
  const [alpha, beta, gamma] = ANGLES;
  // Hyperbolic cosine rule for angles, curvature -1.
  const coshB = (Math.cos(beta) + Math.cos(alpha) * Math.cos(gamma)) / (Math.sin(alpha) * Math.sin(gamma));
  const coshC = (Math.cos(gamma) + Math.cos(alpha) * Math.cos(beta)) / (Math.sin(alpha) * Math.sin(beta));
  const radiusB = Math.tanh(Math.acosh(coshC) / 2); // AB has length c
  const radiusC = Math.tanh(Math.acosh(coshB) / 2); // AC has length b
  return Object.freeze({
    symbol: '*237',
    angles: ANGLES,
    // A is the pi/2 corner, B the pi/3 corner, C the pi/7 corner.
    vertices: [[0, 0], [radiusB, 0], [radiusC * Math.cos(alpha), radiusC * Math.sin(alpha)]],
    area: Math.PI - (alpha + beta + gamma),
  });
}

export function geodesicThrough(first, second) {
  const [ax, ay] = first;
  const [bx, by] = second;
  const determinant = ax * by - ay * bx;
  const scale = Math.max(ax * ax + ay * ay, bx * bx + by * by);
  if (Math.abs(determinant) < EPSILON * scale) {
    const point = Math.hypot(ax, ay) > Math.hypot(bx, by) ? first : second;
    if (Math.hypot(...point) < EPSILON) throw new RangeError('geodesic needs distinct points');
    return { kind: 'diameter', angle: Math.atan2(point[1], point[0]) };
  }
  const a = (1 + ax * ax + ay * ay) / 2;
  const b = (1 + bx * bx + by * by) / 2;
  const cx = (a * by - b * ay) / determinant;
  const cy = (ax * b - bx * a) / determinant;
  const radiusSquared = cx * cx + cy * cy - 1;
  if (!(radiusSquared > 0)) throw new RangeError('expected circle orthogonal to the unit disk');
  return { kind: 'circle', center: [cx, cy], radiusSquared };
}

export function reflectAcross(geodesic, point) {
  if (geodesic.kind === 'diameter') {
    const cosine = Math.cos(2 * geodesic.angle);
    const sine = Math.sin(2 * geodesic.angle);
    return [cosine * point[0] + sine * point[1], sine * point[0] - cosine * point[1]];
  }
  const [cx, cy] = geodesic.center;
  const dx = point[0] - cx;
  const dy = point[1] - cy;
  const factor = geodesic.radiusSquared / (dx * dx + dy * dy);
  return [cx + factor * dx, cy + factor * dy];
}

// r0 fixes AB, r1 fixes AC, r2 fixes BC. Indices refer to the
// vertex opposite the mirror: C, B, A respectively.
const OPPOSITE = [2, 1, 0];

export function reflectChamber(vertices, generatorIndex) {
  if (!Number.isInteger(generatorIndex) || generatorIndex < 0 || generatorIndex > 2) {
    throw new RangeError('reflection generator must be 0, 1, or 2');
  }
  const moved = OPPOSITE[generatorIndex];
  const endpoints = [0, 1, 2].filter((index) => index !== moved);
  const mirror = geodesicThrough(vertices[endpoints[0]], vertices[endpoints[1]]);
  const updated = vertices.map((point) => point.slice());
  updated[moved] = reflectAcross(mirror, vertices[moved]);
  return updated;
}

export function geodesicSamples(from, to, steps = 10) {
  if (!Number.isInteger(steps) || steps < 1) throw new RangeError('steps must be positive');
  const line = geodesicThrough(from, to);
  if (line.kind === 'diameter') {
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return [(1 - t) * from[0] + t * to[0], (1 - t) * from[1] + t * to[1]];
    });
  }
  const [cx, cy] = line.center;
  const radius = Math.sqrt(line.radiusSquared);
  const initialAngle = Math.atan2(from[1] - cy, from[0] - cx);
  const finalAngle = Math.atan2(to[1] - cy, to[0] - cx);
  const difference = Math.atan2(Math.sin(finalAngle - initialAngle), Math.cos(finalAngle - initialAngle));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = initialAngle + difference * i / steps;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
}

function chamberKey(vertices) {
  // Only for suppressing duplicate *drawn* triangles, not proof of equality.
  // The bound on the disk radius limits floating-point conditioning.
  return vertices.flat().map((v) => Math.round(v * 1e7)).join(',');
}

function validChamber(vertices, radius) {
  return vertices.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) &&
    Math.hypot(x, y) < radius);
}

export function buildTiling({ maxDepth = 24, maxChambers = 950, radius = 0.97 } = {}) {
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0 ||
      !Number.isSafeInteger(maxChambers) || maxChambers < 1 ||
      !(radius > 0 && radius < 1)) throw new RangeError('invalid tiling bounds');
  const origin = kleinSchwarzTriangle();
  const first = { vertices: origin.vertices, finite: identity, depth: 0, word: '' };
  const chambers = [first];
  const visited = new Map([[chamberKey(first.vertices), key(first.finite)]]);
  for (let i = 0; i < chambers.length && chambers.length < maxChambers; i += 1) {
    const chamber = chambers[i];
    if (chamber.depth >= maxDepth) continue;
    for (let generator = 0; generator < 3; generator += 1) {
      const vertices = reflectChamber(chamber.vertices, generator);
      if (!validChamber(vertices, radius)) continue;
      const pointKey = chamberKey(vertices);
      const finite = product(chamber.finite, MIRRORS[generator]);
      if (visited.has(pointKey)) {
        if (visited.get(pointKey) !== key(finite)) {
          throw new Error('numeric chamber identification disagrees with exact group quotient');
        }
        continue;
      }
      visited.set(pointKey, key(finite));
      chambers.push({ vertices, finite, depth: chamber.depth + 1, word: chamber.word + generator });
      if (chambers.length >= maxChambers) break;
    }
  }
  return chambers;
}
