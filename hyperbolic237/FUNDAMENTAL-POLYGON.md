# An actual Klein-quartic fundamental polygon, with side pairings

This experiment continues the standalone [`*237` renderer](README.md).
It now constructs a **connected 88-sided polygon** in the Poincaré disk,
made of 336 Schwarz triangles, and lists 44 exact side-pairing transformations.
Identifying those sides gives the compact genus-three Klein quartic.

The 88-gon is deliberately *not* advertised as the familiar, more economical
14-gon or a canonical regular polygon. It is a reproducible nonconvex domain
obtained by breadth-first representatives in the finite quotient; some corners
are straight and the domain can be simplified in future work. Its geometry is
real: the boundary forms one closed cycle in the disk and all pairings have
matching hyperbolic side lengths.

## Run

Node.js 22+, no dependencies:

```sh
node hyperbolic237/render-domain.mjs svg klein-237-fundamental-polygon.svg
node hyperbolic237/render-domain.mjs json klein-237-pairings.json
node --test hyperbolic237/tests/*.test.mjs
```

The SVG colors each Schwarz chamber by its heptagon coset; the thick line is
the boundary. Eight representative pairing pairs are highlighted with matching
numbers/colors; the JSON lists **all 44 pairings**. Each boundary entry
includes a chamber number, reflected side (0/1/2), oriented endpoints, and
corner roles. Each pairing includes a `deckWord` in the global mirror
reflections; reading `deckWord` from left to right means composition of maps.
The word maps the *second* boundary side onto the *first*, reversing its
orientation. Reversing the letters gives its inverse.

## Exact equality in the infinite group

The finite PGL(2,F7) map is *not* faithful: distinct hyperbolic chambers can
have identical finite images. To decide whether chosen chambers actually share
a side, [`tits-representation.mjs`](tits-representation.mjs) implements the
**faithful geometric representation** of the Coxeter group `[2,3,7]`.

Let `t=2 cos(pi/7)`. Then `t^3 - t^2 - 2t + 1=0` and the reflection matrices
have entries in the exact cubic integer ring `Z[t]`. In the basis of simple
roots `e0,e1,e2`, with `r0` opposite the sevenfold vertex, the matrices are

```text
r0 = [-1  0  1]       r1 = [1  0  0]       r2 = [1  0   0]
     [ 0  1  0]            [0 -1  t]            [0  1   0]
     [ 0  0  1]            [0  0  1]            [1  t  -1]
```

They satisfy `r_i^2=1`, `(r0r1)^2=1`, `(r0r2)^3=1`,
`(r1r2)^7=1`. BigInt triples represent coefficients of `1,t,t^2`;
reduction using the monic polynomial keeps every operation exact.
Faithfulness of the Tits geometric representation is a **mathematical theorem
about Coxeter groups**, not something proved just by passing the tests.

Construct the 336 distinct representatives by breadth-first search in the
finite quotient while developing their hyperbolic triangle coordinates and
exact Tits matrices side by side. A side of representative `g` is internal
precisely when the chosen representative of its finite neighbor `g r_i`
has exactly the same Tits matrix as `g r_i`. Otherwise the two boundary
sides are paired by the *kernel element*

```text
deck = g r_i (g')^-1.
```

Both the finite and Tits representations are used to verify each word:
its **finite** image is identity, and its **infinite-group** image is not.
All deck words are orientation preserving (even reflection length). The
numerical disk is a *separate* check that the paired side endpoints and
hyperbolic side lengths actually agree.

## Two independent Euler-characteristic calculations

Before boundary pairing, the exact internal adjacencies give one polygonal
region of 336 triangles with:

| Quantity | Before pairing | After all side identifications |
| --- | ---: | ---: |
| Triangular faces | 336 | 336 |
| Internal edges | 460 | — |
| Boundary edges | 88 | 0 |
| Total edges | 548 | 504 |
| Vertices | 213 | 164 |
| Euler characteristic | 1 | -4 |

The **one boundary cycle** and `chi=1` show the unpaired connected region is a
(topological) disk. In the quotient, the vertices divide into the three
Schwarz-corner types: 84 order-two corners, 56 order-three corners, and
24 order-seven corners, all regular points because the kernel is torsion free.
Thus `V-E+F=164-504+336=-4=2-2g`, so `g=3`. The area of the 336 triangles is
`336*pi/42 = 8*pi`, agreeing with Gauss–Bonnet. Independently, the regular
heptagon map has `F=24, E=84, V=56`, and gives the same genus.

## Boundaries and future work

- The **combinatorial** pairing and subgroup-word equality are exact. The
  coordinates, sampled geodesic arcs, pixel colors, and numeric comparisons
  are approximate; numerical agreement is never used as an equality oracle.
- The domain depends on the BFS traversal order. It is not an optimized
  Dirichlet domain and not a minimal presentation of the surface group.
  A 12-edge canonical polygon (or a 14-gon respecting the sevenfold structure)
  would be a further construction, **not** a relabeling of this 88-gon.
- This does not identify the resulting surface with Tim Hutton's existing
  Euclidean-space 3D embedding point by point. Its old `plane_to_kq` lookup
  is incomplete; claiming this mapping would require new work.
- The faithful Tits matrix is an equality representation, **not** by itself a
  minimal-word reducer, a replayable Coxeter proof ledger, or a general
  algorithm for extracting all hyperbolic fundamental domains.

## Sources and thanks

Thanks to **Chaim Goodman-Strauss**, **Vladimir Bulatov**, and
**Scott Vorthmann** for [SymmHub](https://github.com/SymmHub/SymmHub);
**John Horton Conway**, **William Thurston**, and **Adam A. Deaton** for the
orbifold perspective; **Felix Klein**, **Greg Egan**, and **Tim Hutton** for
understanding and visualizing the Klein quartic. Thanks also to
**Jacques Tits** for the geometric reflection representation and
**James E. Humphreys** for *Reflection Groups and Coxeter Groups*.

The implementation is independent: no SymmHub or Hutton source code is copied.
