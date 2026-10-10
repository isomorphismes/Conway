import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { kleinQuotient, identity, key, MIRRORS, product } from '../finite-quotient.mjs';
import { kleinSchwarzTriangle, reflectChamber } from '../geometry.mjs';
import { applyMirrorWord, hyperbolicDistance, kleinFundamentalPolygon } from '../fundamental-domain.mjs';
import { pairingReport, renderFundamentalPolygonSvg } from '../render-domain.mjs';
import {
  titsEqual, titsIdentity, TITS_MIRRORS, titsKey, titsPower,
  titsProduct, titsWord,
} from '../tits-representation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `expected ${a} ~= ${b}`);
const closePoints = (a, b) => a.forEach((value, i) => close(value, b[i]));
const finiteWord = (word) => [...word].reduce((a, s) => product(a, MIRRORS[Number(s)]), identity);

test('faithful Coxeter representation satisfies [2,3,7] relations in an exact cubic field', () => {
  for (const generator of TITS_MIRRORS) assert.ok(titsEqual(titsPower(generator, 2), titsIdentity));
  for (const [a, b, order] of [[0, 1, 2], [0, 2, 3], [1, 2, 7]]) {
    const ab = titsProduct(TITS_MIRRORS[a], TITS_MIRRORS[b]);
    assert.ok(titsEqual(titsPower(ab, order), titsIdentity));
    for (let exponent = 1; exponent < order; exponent += 1) {
      assert.ok(!titsEqual(titsPower(ab, exponent), titsIdentity));
    }
  }
  assert.ok(titsEqual(titsWord('012201'), titsWord([0, 1, 2, 2, 0, 1])));
  assert.throws(() => titsWord('3'), RangeError);
});

test('one exact infinite-group representative for each finite-group chamber', () => {
  const d = kleinFundamentalPolygon();
  assert.equal(d.chambers.length, kleinQuotient().fullGroup.length);
  assert.equal(new Set(d.chambers.map((n) => key(n.finite))).size, 336);
  assert.equal(new Set(d.chambers.map((n) => titsKey(n.tits))).size, 336);
  const base = kleinSchwarzTriangle().vertices;
  for (const n of d.chambers) {
    assert.equal(n.word.length, n.depth);
    assert.equal(key(finiteWord(n.word)), key(n.finite));
    assert.ok(titsEqual(titsWord(n.word), n.tits));
    if (n.parent != null) {
      assert.ok(n.parent < n.id);
      assert.deepEqual(reflectChamber(d.chambers[n.parent].vertices, n.enteringSide).flat().map((x) => Number(x.toFixed(9))),
        n.vertices.flat().map((x) => Number(x.toFixed(9))));
    }
    for (let i = 0; i < 3; i += 1) {
      closePoints(applyMirrorWord(base[i], n.word), n.vertices[i]);
      assert.ok(Math.hypot(...n.vertices[i]) < 0.91);
    }
  }
});

test('intrinsic adjacency agrees with geometry but is decided by exact group equality', () => {
  const d = kleinFundamentalPolygon();
  let interiors = 0;
  for (const node of d.chambers) for (let side = 0; side < 3; side += 1) {
    const other = d.neighboring[node.id][side];
    assert.equal(d.neighboring[other][side], node.id);
    assert.equal(d.internal[node.id][side], d.internal[other][side]);
    const nextTits = titsProduct(node.tits, TITS_MIRRORS[side]);
    assert.equal(d.internal[node.id][side], titsEqual(nextTits, d.chambers[other].tits));
    if (d.internal[node.id][side]) {
      interiors++;
      reflectChamber(node.vertices, side).forEach((point, i) => closePoints(point, d.chambers[other].vertices[i]));
    }
  }
  assert.equal(interiors, 920);
});

test('selected triangles form a connected disk with exactly one cyclic 88-edge boundary', () => {
  const d = kleinFundamentalPolygon();
  assert.equal(d.summary.regionVertices, 213);
  assert.equal(d.summary.internalEdges, 460);
  assert.equal(d.summary.regionEdges, 548);
  assert.equal(d.summary.regionEuler, 1);
  assert.equal(d.boundary.length, 88);
  assert.equal(new Set(d.boundary.map((e) => `${e.chamber}:${e.side}`)).size, 88);
  for (let i = 0; i < d.boundary.length; i += 1) {
    const current = d.boundary[i];
    const next = d.boundary[(i + 1) % d.boundary.length];
    assert.equal(d.internal[current.chamber][current.side], false);
    closePoints(current.to, next.from);
  }
});

test('44 explicit kernel words pair 88 boundary edges with reversed orientation', () => {
  const d = kleinFundamentalPolygon();
  assert.equal(d.pairings.length, 44);
  const used = new Set();
  for (const pair of d.pairings) {
    const a = d.boundary[pair.first];
    const b = d.boundary[pair.second];
    assert.ok(!used.has(pair.first) && !used.has(pair.second));
    used.add(pair.first);
    used.add(pair.second);
    assert.equal(pair.side, a.side);
    assert.equal(pair.side, b.side);
    assert.deepEqual([a.startRole, a.endRole], [b.endRole, b.startRole]);
    assert.equal(key(finiteWord(pair.deckWord)), key(identity));
    assert.ok(!titsEqual(titsWord(pair.deckWord), titsIdentity));
    assert.equal(pair.deckWord.length % 2, 0);
    assert.ok(titsEqual(titsProduct(titsWord(pair.deckWord), titsWord([...pair.deckWord].reverse())), titsIdentity));
    // Independent numerical check: deck word maps the mate edge to the
    // first edge with the endpoint order reversed, using only fixed mirrors.
    closePoints(applyMirrorWord(b.from, pair.deckWord), a.to);
    closePoints(applyMirrorWord(b.to, pair.deckWord), a.from);
    close(hyperbolicDistance(a.from, a.to), hyperbolicDistance(b.from, b.to));
  }
  assert.equal(used.size, 88);
});

test('full side identifications independently recover genus three', () => {
  const d = kleinFundamentalPolygon();
  assert.deepEqual(d.summary.cornerClasses, [84, 56, 24]);
  assert.equal(d.summary.quotientVertices, 164);
  assert.equal(d.summary.quotientEdges, 504);
  assert.equal(d.summary.quotientFaces, 336);
  assert.equal(d.summary.quotientEuler, -4);
  assert.equal(d.summary.quotientGenus, 3);
  close(d.summary.hyperbolicAreaOverPi * Math.PI, 4 * Math.PI * (d.summary.quotientGenus - 1));
});

test('render and pairing table are reproducible and CLI-readable', () => {
  const first = renderFundamentalPolygonSvg();
  assert.equal(first, renderFundamentalPolygonSvg());
  assert.match(first, /^<svg /);
  assert.match(first, /88-sided hyperbolic fundamental polygon/);
  assert.match(first, /<\/svg>\n$/);
  const report = pairingReport();
  assert.equal(report.pairings.length, 44);
  assert.equal(report.boundary.length, 88);
  assert.ok(report.pairings.every((p) => typeof p.deckWord === 'string'));
  const file = path.join(os.tmpdir(), `klein-237-domain-${process.pid}.json`);
  try {
    const run = spawnSync(process.execPath, [path.join(root, 'render-domain.mjs'), 'json', file], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(parsed.summary.quotientGenus, 3);
    assert.deepEqual(parsed.pairings, report.pairings);
  } finally { fs.rmSync(file, { force: true }); }
});
