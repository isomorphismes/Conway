import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  compilePattern,
  composeTransforms,
  conwayOrbifoldGenerators,
  identityTransform,
  inverseTransform,
  parsePattern,
  renderSvg,
} from '../pattern.mjs';
import {
  circularCubics, compileSubpixel, renderSubpixel, subpixelGeometry, unitCubicRadiusErrorBound,
} from '../subpixel.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function patternFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...patternFiles(full));
    else if (entry.name.endsWith('.pattern')) files.push(full);
  }
  return files.sort();
}

function nearlyIdentity(matrix) {
  const expected = identityTransform();
  assert.equal(matrix.length, expected.length);
  matrix.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-6, `${value} != ${expected[index]} at ${index}`));
}

test('every checked-in example parses and renders to SVG', () => {
  const files = patternFiles(path.join(root, 'examples'));
  assert.ok(files.length >= 10, 'expected the Conway example corpus');
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const program = parsePattern(source);
    assert.ok(program.commands.length > 0, `${file} has nothing to draw`);
    const svg = compilePattern(source);
    assert.match(svg, /^<svg\b/);
    assert.match(svg, /<use\b/);
    assert.match(svg, /<\/svg>\n$/);
  }
});

test('documented Conway shorthands expand', () => {
  const expectedCounts = new Map([
    ['o', 2], ['2222', 3], ['442', 3], ['*442', 4],
    ['333', 3], ['*333', 4], ['632', 3], ['*632', 4],
  ]);
  for (const [symbol, count] of expectedCounts) {
    assert.equal(conwayOrbifoldGenerators(symbol, 84).length, count, symbol);
  }
});

test('generator inverses compose back to identity', () => {
  for (const symbol of ['o', '2222', '442', '*442', '333', '*333', '632', '*632']) {
    for (const generator of conwayOrbifoldGenerators(symbol, 84)) {
      nearlyIdentity(composeTransforms(generator.matrix, inverseTransform(generator.matrix)));
    }
  }
});

test('explicit generator syntax from the language draft runs', () => {
  const source = `
canvas 200 200
viewport -100 -100 100 100
motif mark
  segment 0 0 20 0
end
generator east translate 40 0
generator north translate 0 40
generator quarter_turn rotate 90
generator mirror reflect 0 0 1 0
generator glide glide 0 0 1 0 20
orbit mark
`;
  const svg = compilePattern(source);
  assert.match(svg, /<use\b/);
});

test('CLI writes an SVG file', () => {
  const output = path.join(os.tmpdir(), `conway-pattern-${process.pid}.svg`);
  try {
    const result = spawnSync(process.execPath, [path.join(root, 'pattern.mjs'), path.join(root, 'examples/conway-442.pattern'), output], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(fs.readFileSync(output, 'utf8'), /^<svg\b/);
  } finally {
    fs.rmSync(output, { force: true });
  }
});

function screenScene(body, options = {}) {
  return subpixelGeometry(parsePattern(`canvas 100 100\nviewport -50 -50 50 50\n${body}`), options);
}

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
}

function bezier(points, t) {
  let layer = points.map((p) => [...p]);
  while (layer.length > 1) layer = layer.slice(1).map((p, i) => p.map((value, axis) => (1 - t) * layer[i][axis] + t * value));
  return layer[0];
}

test('subpixel seam reuses the real curved wallpaper and leaves SVG and records unchanged', () => {
  const source = fs.readFileSync(path.join(root, 'examples/conway-442.pattern'), 'utf8');
  const program = parsePattern(source);
  const svg = renderSvg(program);
  const snapshot = structuredClone(program);
  const scene = subpixelGeometry(program, { width: 256, height: 256 });
  assert.equal(scene.background, 'fff8f6ee');
  assert.equal(scene.shapes.length, 2 * (svg.match(/<use\b/g) ?? []).length);
  assert.ok(scene.shapes.some((shape) => shape.segments.some((segment) => segment.kind === 'cubic')));
  assert.ok(scene.shapes.some((shape) => shape.transform[0] * shape.transform[3] - shape.transform[1] * shape.transform[2] < 0));
  assert.deepEqual(program, snapshot);
  assert.equal(renderSvg(program), svg);
  assert.deepEqual(scene.shapes.map((shape) => shape.id), scene.shapes.map((_, i) => i));
  for (const shape of scene.shapes) {
    near(shape.width, 2 * 256 / 720);
    for (const segment of shape.segments) {
      assert.ok(segment.points.flat().every(Number.isFinite));
      if (segment.kind === 'cubic') assert.ok(segment.errorBoundPixels <= 0.01);
    }
  }
  const text = renderSubpixel(program, { width: 256, height: 256 });
  assert.match(text, /^SUBPIXEL-PATH 1\ncanvas 256 256 fff8f6ee\n/);
  assert.equal((text.match(/^shape /gm) ?? []).length, scene.shapes.length);
  assert.equal((text.match(/^end$/gm) ?? []).length, scene.shapes.length);
});

test('screen placement matches SVG meet letterboxing, y flip, translation and reflection', () => {
  const scene = screenScene(`motif mark\nsegment 2 3 7 11\nend\ngenerator mirror reflect 0 0 1 0\norbit mark`, { width: 200, height: 100 });
  assert.equal(scene.shapes.length, 2);
  assert.deepEqual(scene.screenTransform, [1, 0, 0, -1, 100, 50]);
  assert.deepEqual(scene.shapes[0].segments[0].points, [[102, 47], [107, 39]]);
  assert.deepEqual(scene.shapes[1].segments[0].points, [[102, 53], [107, 61]]);
  const translated = screenScene(`motif mark\nsegment 0 0 1 0\nend\ngenerator east translate 25 0\norbit mark`);
  assert.deepEqual(translated.shapes[0].segments[0].points, [[50, 50], [51, 50]]);
  assert.deepEqual(translated.shapes[1].segments[0].points, [[75, 50], [76, 50]]);
});

test('all pieces of an arc/circle retain exact shared endpoints and explicit closure', () => {
  const scene = screenScene(`motif curved\nmove 0 0\nheading 0\narc_left 10 270\nline 0 0\nclose\ncircle 0 0 20\nend\ndraw curved`, { tolerancePixels: 0.00001 });
  assert.equal(scene.shapes.length, 2);
  for (const shape of scene.shapes) {
    for (let i = 1; i < shape.segments.length; i += 1) {
      assert.deepEqual(shape.segments[i].points[0], shape.segments[i - 1].points.at(-1));
    }
    assert.deepEqual(shape.segments[0].points[0], shape.segments.at(-1).points.at(-1));
  }
});

test('left and right arc centers and sweep agree with independent circular geometry', () => {
  for (const [direction, sign] of [['left', 1], ['right', -1]]) {
    const scene = screenScene(`motif turn\nmove 0 0\nheading 0\narc_${direction} 10 90\nend\ndraw turn`, { tolerancePixels: 1 });
    const [segment] = scene.shapes[0].segments;
    assert.deepEqual(segment.points[0], [50, 50]);
    near(segment.points[3][0], 60);
    near(segment.points[3][1], 50 - 10 * sign);
    const [x, y] = bezier(segment.points, 0.5);
    near(x, 50 + 10 / Math.sqrt(2));
    near(y, 50 - sign * (10 - 10 / Math.sqrt(2)));
  }
});

test('Bernstein bound controls circular error and tight tolerance produces more true cubics', () => {
  const identity = identityTransform();
  for (const angle of [Math.PI / 2, -Math.PI / 3, 3 * Math.PI / 2, -2 * Math.PI]) {
    const loose = circularCubics(0, 0, 50, 0.37, angle, identity, 1, 0.1);
    const tight = circularCubics(0, 0, 50, 0.37, angle, identity, 1, 0.00001);
    assert.ok(tight.length > loose.length);
    for (const segment of tight) {
      assert.equal(segment.kind, 'cubic');
      for (let i = 0; i <= 100; i += 1) {
        const [x, y] = bezier(segment.points, i / 100);
        assert.ok(Math.abs(Math.hypot(x, y) - 50) <= segment.errorBoundPixels);
      }
      assert.ok(segment.errorBoundPixels <= 0.00001);
    }
  }
  // A deliberate control-point mutant cannot inherit the circle's small bound.
  const broken = [[1, 0], [1, 2], [2, 1], [0, 1]];
  assert.ok(unitCubicRadiusErrorBound(broken) > 1);
});

test('paint order follows command, existing orbit order and shape order, including alpha', () => {
  const scene = screenScene(`motif one\nstroke #f008 2\nsegment 0 0 1 0\nstroke #00f 3\nsegment 0 0 0 1\nend\nmotif two\nstroke #0f0 4\nsegment 0 0 2 0\nend\ngenerator mirror reflect 0 0 1 0\norbit one\ndraw two`);
  assert.deepEqual(scene.shapes.map((shape) => [shape.color, shape.width]), [
    ['88ff0000', 2], ['ff0000ff', 3], ['88ff0000', 2], ['ff0000ff', 3], ['ff00ff00', 4],
  ]);
});

test('transfer refuses unsupported fills/colors/transforms and preserves empty geometry explicitly', () => {
  assert.throws(() => screenScene(`fill #f00\nmotif filled\ncircle 0 0 3\nend\ndraw filled`), /does not support fill/);
  assert.throws(() => screenScene(`stroke red 1\nmotif mark\nsegment 0 0 1 0\nend\ndraw mark`), /stroke must be a hex/);
  const program = parsePattern(`motif mark\nsegment 0 0 1 0\nend\ngenerator east translate 100 0\norbit mark`);
  program.generators[0].matrix[0] = 2;
  assert.throws(() => subpixelGeometry(program), /requires Euclidean isometries/);
  const empty = compileSubpixel('motif empty\nmove 1 1\nend\ndraw empty', { width: 50, height: 50 });
  assert.doesNotMatch(empty, /^shape /m);
  assert.match(empty, /^SUBPIXEL-PATH 1\ncanvas 50 50 ffffffff/);
  const invisible = screenScene(`stroke none 1\nmotif mark\nsegment 0 0 1 0\nend\ndraw mark`);
  assert.equal(invisible.shapes.length, 0);
  assert.throws(() => screenScene('', { width: 0 }), /positive integer/);
  assert.throws(() => screenScene('', { tolerancePixels: 0 }), /finite and positive/);
});

test('native transfer CLI consumes the actual checked-in source and fails without partial output', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'subpixel.mjs'), path.join(root, 'examples/conway-442.pattern'), '--size', '256', '256'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^SUBPIXEL-PATH 1\ncanvas 256 256 fff8f6ee\n/);
  assert.match(result.stdout, /^cubic /m);
  const invalid = spawnSync(process.execPath, [path.join(root, 'subpixel.mjs'), path.join(root, 'examples/conway-442.pattern'), '--tolerance', '0'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
  assert.match(invalid.stderr, /circular tolerance must be finite and positive/);
});
