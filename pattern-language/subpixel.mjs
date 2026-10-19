#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PatternError, composeTransforms, enumerateOrbit, identityTransform, parsePattern,
} from './pattern.mjs';

const choose3 = [1, 3, 3, 1];
const choose6 = [1, 6, 15, 20, 15, 6, 1];

function checkedPositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new PatternError(`${name} must be finite and positive`);
  return value;
}

function point(matrix, x, y) {
  const [a, b, c, d, e, f] = matrix;
  const result = [a * x + c * y + e, b * x + d * y + f];
  if (!result.every(Number.isFinite)) throw new PatternError('non-finite screen coordinate');
  return result;
}

function checkedIsometry(matrix) {
  if (matrix.length !== 6 || !matrix.every(Number.isFinite)) throw new PatternError('invalid affine transform');
  const [a, b, c, d] = matrix;
  if (Math.abs(a * a + b * b - 1) > 1e-6 || Math.abs(c * c + d * d - 1) > 1e-6
      || Math.abs(a * c + b * d) > 1e-6) {
    throw new PatternError('subpixel stroke transfer requires Euclidean isometries');
  }
}

function colorArgb(value, name, allowNone = false) {
  if (allowNone && value === 'none') return null;
  if (typeof value !== 'string' || !/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) {
    throw new PatternError(`${name} must be a hex RGB/RGBA color${allowNone ? ' or none' : ''}`);
  }
  let hex = value.slice(1).toLowerCase();
  if (hex.length <= 4) hex = [...hex].map((digit) => digit + digit).join('');
  if (hex.length === 6) hex += 'ff';
  return hex.slice(6) + hex.slice(0, 6);
}

// Degree-six Bernstein coefficients of squared distance to the unit center.
// Their convex hull bounds the whole polynomial, not just sampled t values.
export function unitCubicRadiusErrorBound(points) {
  let bound = 0;
  for (let k = 0; k <= 6; k += 1) {
    let coefficient = 0;
    for (let i = Math.max(0, k - 3); i <= Math.min(3, k); i += 1) {
      const j = k - i;
      coefficient += choose3[i] * choose3[j] / choose6[k]
        * (points[i][0] * points[j][0] + points[i][1] * points[j][1]);
    }
    bound = Math.max(bound, Math.abs(coefficient - 1));
  }
  return bound + 128 * Number.EPSILON;
}

function tangentCubic(start, angle) {
  const end = start + angle;
  const distance = 4 / 3 * Math.tan(angle / 4);
  return [
    [Math.cos(start), Math.sin(start)],
    [Math.cos(start) - distance * Math.sin(start), Math.sin(start) + distance * Math.cos(start)],
    [Math.cos(end) + distance * Math.sin(end), Math.sin(end) - distance * Math.cos(end)],
    [Math.cos(end), Math.sin(end)],
  ];
}

// Isometries followed by the uniform viewport scale preserve this radial bound.
export function circularCubics(cx, cy, radius, start, angle, matrix, screenScale, tolerancePixels) {
  checkedPositive(radius, 'circle radius');
  checkedPositive(screenScale, 'circular screen scale');
  checkedPositive(tolerancePixels, 'circular tolerance');
  if (![cx, cy, start, angle, screenScale].every(Number.isFinite)) throw new PatternError('invalid circular geometry');
  const pieces = [];
  function subdivide(pieceStart, pieceAngle, depth) {
    const unit = tangentCubic(pieceStart, pieceAngle);
    const errorBoundPixels = radius * screenScale * unitCubicRadiusErrorBound(unit);
    if (Math.abs(pieceAngle) <= Math.PI / 2 + 1e-14 && errorBoundPixels <= tolerancePixels) {
      const points = unit.map(([x, y]) => point(matrix, cx + radius * x, cy + radius * y));
      if (pieces.length) points[0] = pieces[pieces.length - 1].points[3];
      pieces.push({ kind: 'cubic', points, errorBoundPixels });
      return;
    }
    if (depth >= 24) throw new PatternError('circular tolerance cannot be met with binary64 geometry');
    subdivide(pieceStart, pieceAngle / 2, depth + 1);
    subdivide(pieceStart + pieceAngle / 2, pieceAngle / 2, depth + 1);
  }
  if (angle !== 0) subdivide(start, angle, 0);
  return pieces;
}

function arcSegments(start, args, matrix, scale, tolerance) {
  const [rx, ry, rotation, large, sweep, x, y] = args;
  if (!(rx > 0) || rx !== ry || rotation !== 0 || ![0, 1].includes(large) || ![0, 1].includes(sweep)) {
    throw new PatternError('subpixel transfer supports circular SVG arcs with zero axis rotation');
  }
  const end = [x, y];
  const dx = (start[0] - x) / 2;
  const dy = (start[1] - y) / 2;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared === 0) return []; // SVG omits an arc with identical endpoints.
  const radius = Math.max(rx, Math.sqrt(distanceSquared)); // SVG radius correction.
  const multiplier = (large === sweep ? -1 : 1)
    * Math.sqrt(Math.max(0, (radius * radius - distanceSquared) / distanceSquared));
  const cx = (start[0] + x) / 2 + multiplier * dy;
  const cy = (start[1] + y) / 2 - multiplier * dx;
  const first = Math.atan2(start[1] - cy, start[0] - cx);
  let angle = Math.atan2((start[0] - cx) * (y - cy) - (start[1] - cy) * (x - cx),
    (start[0] - cx) * (x - cx) + (start[1] - cy) * (y - cy));
  if (sweep && angle < 0) angle += 2 * Math.PI;
  if (!sweep && angle > 0) angle -= 2 * Math.PI;
  const segments = circularCubics(cx, cy, radius, first, angle, matrix, scale, tolerance);
  if (segments.length) {
    segments[0].points[0] = point(matrix, ...start);
    segments[segments.length - 1].points[3] = point(matrix, ...end);
  }
  return segments;
}

function pathSegments(d, matrix, scale, tolerance) {
  // Only consume the absolute M/L/A/Z grammar emitted by pattern.mjs.
  const tokens = d.trim().split(/\s+/);
  const segments = [];
  let current = null;
  let first = null;
  for (let index = 0; index < tokens.length;) {
    const command = tokens[index++];
    const count = { M: 2, L: 2, A: 7, Z: 0 }[command];
    if (count == null) throw new PatternError(`unsupported emitted SVG path command ${command}`);
    const args = tokens.slice(index, index + count).map(Number);
    if (args.length !== count || !args.every(Number.isFinite)) throw new PatternError('invalid emitted SVG path coordinates');
    index += count;
    if (command === 'M') { current = args; first = args; continue; }
    if (!current) throw new PatternError('emitted SVG path must start with M');
    if (command === 'A') {
      segments.push(...arcSegments(current, args, matrix, scale, tolerance));
      current = args.slice(5);
    } else {
      const end = command === 'Z' ? first : args;
      segments.push({ kind: 'line', points: [point(matrix, ...current), point(matrix, ...end)] });
      current = end;
    }
  }
  return segments;
}

export function subpixelGeometry(program, options = {}) {
  const width = options.width ?? program.canvas.width;
  const height = options.height ?? program.canvas.height;
  for (const [name, value] of [['canvas width', width], ['canvas height', height]]) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new PatternError(`${name} must be a positive integer`);
  }
  const tolerancePixels = checkedPositive(options.tolerancePixels ?? 0.01, 'circular tolerance');
  const background = colorArgb(program.background, 'background');
  if (!background.startsWith('ff')) throw new PatternError('subpixel comparison requires an opaque background');
  const { minX, minY, maxX, maxY } = program.viewport;
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
  checkedPositive(scale, 'viewport scale');
  const screen = [scale, 0, 0, -scale,
    (width - scale * (maxX - minX)) / 2 - scale * minX,
    (height - scale * (maxY - minY)) / 2 + scale * maxY];
  const shapes = [];
  for (const command of program.commands) {
    const motif = program.motifs.get(command.motif);
    // Validate even a shape whose orbit happens to be outside the viewport.
    for (const shape of motif.shapes) {
      if (shape.fill !== 'none') throw new PatternError(`subpixel transfer does not support fill ${shape.fill}`);
      colorArgb(shape.stroke, 'stroke', true);
      checkedPositive(shape.strokeWidth, 'stroke width');
      if (!['path', 'circle'].includes(shape.kind)) throw new PatternError(`unsupported shape kind ${shape.kind}`);
    }
    for (const generator of program.generators) checkedIsometry(generator.matrix);
    const matrices = command.kind === 'draw' ? [identityTransform()] : enumerateOrbit(program, motif);
    for (const matrix of matrices) {
      checkedIsometry(matrix);
      const transform = composeTransforms(screen, matrix);
      // Use a matrix norm upper bound, retaining floating-point isometry drift.
      const [a, b, c, d] = matrix;
      const normBound = Math.sqrt(Math.max(a * a + b * b + Math.abs(a * c + b * d),
        c * c + d * d + Math.abs(a * c + b * d)));
      for (const shape of motif.shapes) {
        const color = colorArgb(shape.stroke, 'stroke', true);
        if (color == null) continue;
        const segments = shape.kind === 'circle'
          ? circularCubics(shape.cx, shape.cy, shape.radius, 0, 2 * Math.PI, transform, scale * normBound, tolerancePixels)
          : pathSegments(shape.d, transform, scale * normBound, tolerancePixels);
        if (shape.kind === 'circle' && segments.length) segments[segments.length - 1].points[3] = segments[0].points[0];
        if (segments.length) shapes.push({ id: shapes.length, color, opacity: 1,
          width: shape.strokeWidth * scale, segments, motif: motif.name, transform: [...matrix] });
      }
    }
  }
  return { width, height, background, screenTransform: screen, tolerancePixels, shapes };
}

export function renderSubpixel(program, options = {}) {
  const scene = subpixelGeometry(program, options);
  const lines = ['SUBPIXEL-PATH 1', `canvas ${scene.width} ${scene.height} ${scene.background}`,
    `# circular-error-bound-pixels ${scene.tolerancePixels}`,
    `# viewport-to-screen ${scene.screenTransform.join(' ')}`];
  for (const shape of scene.shapes) {
    lines.push(`shape ${shape.id} ${shape.color} ${shape.opacity} ${shape.width}`);
    for (const segment of shape.segments) lines.push(`${segment.kind} ${segment.points.flat().join(' ')}`);
    lines.push('end');
  }
  return `${lines.join('\n')}\n`;
}

export function compileSubpixel(source, options = {}) {
  return renderSubpixel(parsePattern(source), options);
}

function runCli(args) {
  try {
    const files = [];
    const options = {};
    for (let i = 0; i < args.length; i += 1) {
      if (args[i] === '--size') { options.width = Number(args[++i]); options.height = Number(args[++i]); }
      else if (args[i] === '--tolerance') options.tolerancePixels = Number(args[++i]);
      else if (args[i].startsWith('-') && args[i] !== '-') throw new PatternError(`unknown option ${args[i]}`);
      else files.push(args[i]);
    }
    if (files.length < 1 || files.length > 2) throw new PatternError('usage: node pattern-language/subpixel.mjs INPUT.pattern [OUTPUT.sppath|-] [--size WIDTH HEIGHT] [--tolerance PIXELS]');
    const output = compileSubpixel(fs.readFileSync(files[0], 'utf8'), options);
    if (files[1] == null || files[1] === '-') process.stdout.write(output);
    else fs.writeFileSync(files[1], output);
    return 0;
  } catch (error) {
    process.stderr.write(`${error.name ?? 'Error'}: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] != null && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli(process.argv.slice(2));
}
