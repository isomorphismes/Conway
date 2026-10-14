#!/usr/bin/env node
/* Standalone SVG + JSON entry point; the Euclidean pattern.mjs grammar remains unchanged. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildTiling, geodesicSamples, kleinSchwarzTriangle } from './geometry.mjs';
import { key, kleinQuotient } from './finite-quotient.mjs';

const coordinate = (value) => Number(value.toFixed(7));
const xy = ([x, y]) => `${coordinate(x)} ${coordinate(y)}`;

function colorForHeptagon(index) {
  const hue = (index * 137.508) % 360;
  const saturation = 0.62;
  const lightness = 0.68;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const offset = lightness - chroma / 2;
  const components = hue < 60 ? [chroma, second, 0] :
    hue < 120 ? [second, chroma, 0] :
      hue < 180 ? [0, chroma, second] :
        hue < 240 ? [0, second, chroma] :
          hue < 300 ? [second, 0, chroma] : [chroma, 0, second];
  return `#${components.map((part) => Math.round(255 * (part + offset)).toString(16).padStart(2, '0')).join('')}`;
}

function trianglePath(vertices) {
  let path = `M ${xy(vertices[0])}`;
  for (let edge = 0; edge < 3; edge += 1) {
    const samples = geodesicSamples(vertices[edge], vertices[(edge + 1) % 3], 9);
    for (const point of samples.slice(1)) path += ` L ${xy(point)}`;
  }
  return `${path} Z`;
}

export function renderTilingSvg({ maxDepth = 25, maxChambers = 950, radius = 0.965 } = {}) {
  const quotient = kleinQuotient();
  const chambers = buildTiling({ maxDepth, maxChambers, radius });
  const shapes = chambers.map((chamber) => {
    const label = quotient.chamberToHeptagon.get(key(chamber.finite));
    if (label === undefined) throw new Error('missing exact heptagon coset');
    // Label is defined by finite group cosets, never inferred from float positions.
    return `<path d="${trianglePath(chamber.vertices)}" fill="${colorForHeptagon(label)}" stroke="#263545" stroke-width="0.0022" stroke-linejoin="round"/>`;
  }).join('\n');
  const baseTriangle = kleinSchwarzTriangle();
  const inset = `<path d="${trianglePath(baseTriangle.vertices)}" fill="none" stroke="#fff" stroke-width="0.007"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.09 -1.09 2.18 2.18" width="960" height="960" role="img" aria-label="Hyperbolic *237 reflection triangles colored by 24 Klein-quartic heptagon cosets">
<title>*237 triangle reflection group / Klein quartic heptagon cosets</title>
<desc>Numerical Poincare-disk tiling; 24 colors assigned by exact PGL(2,7) right cosets. The disk is a covering-space patch, not an embedding of the compact Klein quartic.</desc>
<rect x="-1.09" y="-1.09" width="2.18" height="2.18" fill="#101821"/>
<defs><clipPath id="unit-disk"><circle r="1"/></clipPath></defs>
<g clip-path="url(#unit-disk)"><circle r="1" fill="#f4f6f7"/>${shapes}${inset}</g>
<circle r="1" fill="none" stroke="#e2eaf2" stroke-width="0.007"/>
</svg>\n`;
}

export function report() {
  const quotient = kleinQuotient();
  const triangle = kleinSchwarzTriangle();
  return {
    ...quotient.summary,
    schwarzTriangleAreaOverPi: Number((triangle.area / Math.PI).toFixed(12)),
    proofBoundary: 'finite-field group identities exact; Poincare geometry sampled numerically',
  };
}

const calledAsProgram = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (calledAsProgram) {
  const [mode = 'svg', output, triangles] = process.argv.slice(2);
  if (mode !== 'svg' && mode !== 'json') {
    process.stderr.write('Usage: node hyperbolic237/render.mjs svg [output.svg] [maxChambers] | json [output.json]\n');
    process.exitCode = 2;
  } else {
    const maxChambers = triangles === undefined ? 950 : Number(triangles);
    const content = mode === 'json' ? `${JSON.stringify(report(), null, 2)}\n` : renderTilingSvg({ maxChambers });
    if (output) fs.writeFileSync(output, content);
    else process.stdout.write(content);
  }
}
