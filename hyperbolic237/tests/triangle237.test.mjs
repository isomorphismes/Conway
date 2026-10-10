import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  D, U, V, identity, inverse, key, kleinQuotient,
  matrixPower, MIRRORS, product, projective,
} from '../finite-quotient.mjs';
import {
  buildTiling, geodesicSamples, geodesicThrough, kleinSchwarzTriangle,
  reflectAcross, reflectChamber,
} from '../geometry.mjs';
import { renderTilingSvg, report } from '../render.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const almostEqual = (a, b, epsilon = 2e-8) => assert.ok(Math.abs(a - b) <= epsilon, `${a} vs ${b}`);
const almostPoint = (a, b, epsilon = 2e-8) => a.forEach((x, i) => almostEqual(x, b[i], epsilon));
const matrixIsIdentity = (matrix) => assert.equal(key(matrix), key(identity));

test('finite field projective matrices reject singulars and identify scalar multiples', () => {
  assert.deepEqual(projective([3, 0, 0, 3]), identity);
  assert.deepEqual(projective([6, 6, 0, 6]), U);
  assert.throws(() => projective([1, 2, 2, 4]), RangeError);
  assert.throws(() => projective([1.5, 0, 0, 1]), TypeError);
});

test('the 2,3,7 Coxeter presentation holds exactly in PGL2(F7)', () => {
  const [r0, r1, r2] = MIRRORS;
  for (const reflection of MIRRORS) matrixIsIdentity(matrixPower(reflection, 2));
  matrixIsIdentity(matrixPower(product(r0, r1), 2));
  matrixIsIdentity(matrixPower(product(r0, r2), 3));
  matrixIsIdentity(matrixPower(product(r1, r2), 7));
  assert.equal(key(product(r0, r1)), key(V));
  assert.equal(key(product(r1, r2)), key(U));
  assert.equal(key(product(r0, r2)), key(product(V, U)));
  assert.equal(key(product(D, product(U, D))), key(inverse(U)));
  matrixIsIdentity(product(U, inverse(U)));
  assert.notEqual(key(matrixPower(U, 1)), key(identity));
  assert.notEqual(key(matrixPower(U, 7 - 1)), key(identity));
  assert.throws(() => matrixPower(U, -1), RangeError);
});

test('exact finite quotient has 24 heptagons, 84 edges, 56 vertices and genus 3', () => {
  const quotient = kleinQuotient();
  assert.equal(quotient.fullGroup.length, 336);
  assert.equal(new Set(quotient.fullGroup.map(key)).size, 336);
  assert.equal(quotient.orientationGroup.length, 168);
  assert.equal(quotient.heptagonStabilizer.length, 14);
  assert.equal(new Set(quotient.chamberToHeptagon.values()).size, 24);
  assert.equal(quotient.faceCycles.length, 24);
  assert.equal(quotient.edgeCycles.length, 84);
  assert.equal(quotient.vertexCycles.length, 56);
  assert.equal(quotient.summary.eulerCharacteristic, -4);
  assert.equal(quotient.summary.genus, 3);
  // A reflection across either side adjacent to the 7-fold vertex keeps
  // the local heptagon label; that is why the SVG has heptagon color patches.
  for (const g of quotient.fullGroup) {
    const label = quotient.chamberToHeptagon.get(key(g));
    for (const i of [1, 2]) {
      const neighbor = product(g, MIRRORS[i]);
      assert.equal(quotient.chamberToHeptagon.get(key(neighbor)), label);
    }
  }
});

test('face, edge and vertex permutations glue into an oriented map', () => {
  const { orientationGroup } = kleinQuotient();
  const vertexTurn = inverse(product(V, U));
  for (const dart of orientationGroup) {
    // Face ∘ edge ∘ vertex = identity. Matrix multiplication is on the right.
    const after = product(product(product(dart, vertexTurn), V), U);
    assert.equal(key(after), key(dart));
  }
});

test('Schwarz triangle has area pi/42, and geodesic mirrors are involutions', () => {
  const { vertices, area } = kleinSchwarzTriangle();
  almostEqual(area / Math.PI, 1 / 42, 2e-15);
  const [a, b, c] = vertices;
  almostEqual(a[0], 0);
  almostEqual(a[1], 0);
  almostEqual(b[1], 0);
  almostEqual(c[0], 0);
  const probe = [0.12, 0.11];
  for (const [start, end] of [[a, b], [a, c], [b, c]]) {
    const mirror = geodesicThrough(start, end);
    almostPoint(reflectAcross(mirror, reflectAcross(mirror, probe)), probe);
    almostPoint(reflectAcross(mirror, start), start);
    almostPoint(reflectAcross(mirror, end), end);
    const samples = geodesicSamples(start, end);
    almostPoint(samples[0], start);
    almostPoint(samples.at(-1), end);
    assert.ok(samples.every(([x, y]) => Math.hypot(x, y) < 1));
  }
  for (const generator of [0, 1, 2]) {
    almostPoint(reflectChamber(reflectChamber(vertices, generator), generator)[0], a);
    almostPoint(reflectChamber(reflectChamber(vertices, generator), generator)[1], b);
    almostPoint(reflectChamber(reflectChamber(vertices, generator), generator)[2], c);
  }
});

test('numerical tiling agrees with exact finite quotient labels on every chamber', () => {
  const chambers = buildTiling({ maxDepth: 14, maxChambers: 380, radius: 0.95 });
  const quotient = kleinQuotient();
  assert.ok(chambers.length >= 300);
  for (const chamber of chambers) {
    assert.equal(typeof quotient.chamberToHeptagon.get(key(chamber.finite)), 'number');
    assert.ok(chamber.vertices.flat().every(Number.isFinite));
    assert.ok(chamber.vertices.every(([x, y]) => Math.hypot(x, y) < 0.95));
    assert.ok(chamber.word.length === chamber.depth);
  }
});

test('rendering is deterministic, standalone, and the JSON CLI reports the quotient', () => {
  const options = { maxDepth: 8, maxChambers: 90, radius: 0.9 };
  const svg = renderTilingSvg(options);
  assert.equal(svg, renderTilingSvg(options));
  assert.match(svg, /^<svg /);
  assert.match(svg, /<clipPath/);
  assert.match(svg, /fill="#[0-9a-f]{6}"/);
  assert.match(svg, /<\/svg>\n$/);
  assert.equal(report().genus, 3);
  const output = path.join(os.tmpdir(), `conway-237-${process.pid}.json`);
  try {
    const run = spawnSync(process.execPath, [path.join(root, 'render.mjs'), 'json', output], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const parsed = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.deepEqual([parsed.heptagons, parsed.edges, parsed.vertices], [24, 84, 56]);
  } finally {
    fs.rmSync(output, { force: true });
  }
});
