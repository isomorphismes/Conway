#!/usr/bin/env node
/* Render the actual 88-sided fundamental polygon and export its side pairings. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { kleinQuotient, key } from './finite-quotient.mjs';
import { geodesicSamples } from './geometry.mjs';
import { kleinFundamentalPolygon } from './fundamental-domain.mjs';

const coordinate = (value) => Number(value.toFixed(9));
const xy = ([x, y]) => `${coordinate(x)} ${coordinate(y)}`;

function geometricArc(from, to, steps = 8) {
  return geodesicSamples(from, to, steps).slice(1).map((point) => ` L ${xy(point)}`).join('');
}
function trianglePath(vertices) {
  let path = `M ${xy(vertices[0])}`;
  for (let s = 0; s < 3; s += 1) path += geometricArc(vertices[s], vertices[(s + 1) % 3]);
  return `${path} Z`;
}
function sidePath(edge) { return `M ${xy(edge.from)}${geometricArc(edge.from, edge.to, 12)}`; }

function heptagonColor(index) {
  const hue = (index * 137.508) % 360;
  const saturation = 0.35;
  const lightness = 0.74;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const base = lightness - chroma / 2;
  const channels = hue < 60 ? [chroma, second, 0] : hue < 120 ? [second, chroma, 0] :
    hue < 180 ? [0, chroma, second] : hue < 240 ? [0, second, chroma] :
      hue < 300 ? [second, 0, chroma] : [chroma, 0, second];
  return `#${channels.map((c) => Math.round((c + base) * 255).toString(16).padStart(2, '0')).join('')}`;
}
function pairColor(index) { return ['#f35f65', '#51c9d2', '#f5b23c', '#ae8ff7', '#89c96c', '#ff81b7'][index % 6]; }

export function renderFundamentalPolygonSvg({ highlightPairs = 8 } = {}) {
  if (!Number.isInteger(highlightPairs) || highlightPairs < 0 || highlightPairs > 44) throw new RangeError('invalid highlighted-pair count');
  const domain = kleinFundamentalPolygon();
  const heptagons = kleinQuotient().chamberToHeptagon;
  const chamberSvg = domain.chambers.map((node) => {
    const index = heptagons.get(key(node.finite));
    return `<path d="${trianglePath(node.vertices)}" fill="${heptagonColor(index)}" stroke="#566578" stroke-width="0.0015" stroke-linejoin="round"/>`;
  }).join('\n');
  const outlineSvg = domain.boundary.map((edge) =>
    `<path d="${sidePath(edge)}" fill="none" stroke="#152c43" stroke-width="0.008" stroke-linecap="round"/>`).join('\n');
  const selected = domain.pairings.slice(0, highlightPairs);
  const marked = selected.flatMap((pair, index) => [pair.first, pair.second].map((edgeIndex) => {
    const edge = domain.boundary[edgeIndex];
    const mid = geodesicSamples(edge.from, edge.to, 2)[1];
    const color = pairColor(index);
    return `<path d="${sidePath(edge)}" fill="none" stroke="${color}" stroke-width="0.018" stroke-linecap="round"/><circle cx="${coordinate(mid[0])}" cy="${coordinate(mid[1])}" r="0.018" fill="#182333" stroke="${color}" stroke-width="0.007"/><text x="${coordinate(mid[0])}" y="${coordinate(mid[1] + 0.006)}" text-anchor="middle" font-family="sans-serif" font-size="0.018" fill="#fff">${index + 1}</text>`;
  })).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.06 -1.06 2.12 2.12" width="1200" height="1200" role="img" aria-label="Klein quartic 336-triangle fundamental polygon with 88 sides and selected matching boundary pairs">
<title>Klein quartic: a connected 88-sided hyperbolic fundamental polygon</title>
<desc>All 336 hyperbolic (2,3,7) Schwarz triangles colored by 24 exact heptagon cosets. Thick dark outline: 88 sides of a single polygonal disk. Identical numbered colored marks show selected boundary side pairings. The other 44-minus-highlightPairs pairings are listed in the JSON output. All edges are sampled geodesic arcs.</desc>
<rect x="-1.06" y="-1.06" width="2.12" height="2.12" fill="#0e1925"/>
<circle r="1" fill="#edf3f5" stroke="#a7b7c7" stroke-width="0.006"/>
${chamberSvg}
${outlineSvg}
${marked}
</svg>\n`;
}

export function pairingReport() {
  const { boundary, pairings, summary } = kleinFundamentalPolygon();
  return {
    summary,
    boundary: boundary.map(({ index, chamber, side, startRole, endRole, from, to }) =>
      ({ index, chamber, side, startRole, endRole, from, to })),
    pairings: pairings.map(({ first, second, side, deckWord }) =>
      ({ first, second, side, deckWord, inverseDeckWord: [...deckWord].reverse().join('') })),
    caveat: 'geodesic endpoints are numerical; quotient, Tits equalities and pairing words are exact',
  };
}

const calledAsProgram = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (calledAsProgram) {
  const [mode = 'svg', output] = process.argv.slice(2);
  if (!['svg', 'json'].includes(mode)) {
    process.stderr.write('Usage: node hyperbolic237/render-domain.mjs svg [output.svg] | json [output.json]\n');
    process.exitCode = 2;
  } else {
    const content = mode === 'json' ? `${JSON.stringify(pairingReport(), null, 2)}\n` : renderFundamentalPolygonSvg();
    if (output) fs.writeFileSync(output, content);
    else process.stdout.write(content);
  }
}
