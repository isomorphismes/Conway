# The Sensual (Quadratic) Form

John Horton Conway, assisted by Francis Y. C. Fung, *The Sensual (Quadratic) Form*, Carus Mathematical Monographs 26, Mathematical Association of America, 1997, xiv + 152 pp.

- Print ISBN: `978-1-4704-4842-4`
- eBook ISBN: `978-1-61444-025-3`
- DOI: `10.5948/UPO9781614440253`
- Publisher record: https://bookstore.ams.org/CAR/26
- JSTOR record and chapter index: https://www.jstor.org/stable/10.4169/j.ctt5hh92j
- Cambridge Core record: https://www.cambridge.org/core/books/sensual-quadratic-form/607BA0F10F5BDBCA836CBD64882E78D4

## Full text

This repository does **not** mirror the book itself. The work is identified by its publisher and JSTOR as a 1997 copyrighted publication. A copy being reachable somewhere on the web is not, by itself, evidence that the repository may redistribute it under the repository license.

If an explicit redistribution license or other authoritative permission is found later, that can be recorded and the decision revisited. Until then, the material here is an original chapter-by-chapter guide rather than a substitute copy of the book.

## Why this book matters here

Conway treats quadratic forms as things one can see, hear, feel, smell, and taste rather than merely as coefficient matrices. The organizing idea is useful computationally as well as pedagogically: the mathematical form is the object; a matrix is one representation of it after a basis has been chosen.

That distinction matters for Idriç. A quadratic form should not collapse to `Matrix`. A basis change alters the representing matrix while leaving the form itself unchanged. Likewise, for complex coefficient spaces an expression such as

`d* G d`

with conjugate transpose `d*` is naturally a Hermitian form (and, when positive semidefinite, a squared seminorm), not an ordinary complex quadratic form `dᵀ G d`. The type system should be able to preserve that distinction.

## Chapter guide

### First Lecture — Can You See the Values of 3x² + 6xy − 5y²?

Conway introduces the **topograph**, a visual organization of the primitive values of a binary integral quadratic form. Instead of treating reduction, representation, equivalence, and automorphisms as separate symbolic procedures, the topograph puts them into one geometric picture.

For indefinite forms, sign changes organize themselves around a river separating positive and negative values. For definite forms, the same picture supports reduction and classification. The chapter culminates in effective procedures for deciding whether a binary quadratic form represents a given integer, finding a representation when it exists, deciding equivalence of forms, and finding their isometry groups.

Computationally, the important lesson is that a quadratic form carries structure not visible in a raw coefficient array: representation values, reduction data, equivalence, and symmetries are properties of the form itself.

### Afterthoughts — PSL₂(Z) and Farey Fractions

The topograph is placed in the more standard geometry of the modular group. Conway relates its trivalent combinatorics to the action of `PSL₂(Z)` on the upper half-plane and to Farey fractions.

This identifies the visual tree from the first lecture with familiar arithmetic geometry rather than presenting it as an isolated diagrammatic trick. Changes of variables in binary forms, modular transformations, and neighboring rational directions become different views of the same structure.

### Second Lecture — Can You Hear the Shape of a Lattice?

The question is the lattice analogue of Kac's question about hearing the shape of a drum. For a positive-definite integral quadratic form, the represented norms and their multiplicities are packaged by its theta series. Conway calls a property **audible** when it can be recovered from that representation data.

The chapter asks how much of a lattice can be reconstructed from the lengths of all its vectors. Some information, including determinant and related dual data, is audible; nevertheless distinct lattices can have the same theta series. The discussion connects quadratic forms with isospectral flat tori and the classical counterexamples to naive spectral rigidity.

### Afterthoughts — Kneser's Gluing Method: Unimodular Lattices

Kneser's gluing method builds new integral lattices by adjoining suitable cosets to root lattices or sums of root lattices. The method is particularly effective for producing and organizing unimodular lattices of small determinant.

Conway uses it to place the isospectral examples in the larger theory of high-dimensional lattices, including the two even unimodular lattices in dimension 16, `E₈ ⊕ E₈` and `D₁₆⁺`, and the kind of gluing used in the classification of Niemeier lattices.

### Third Lecture — … and Can You Feel Its Form?

The emphasis moves from arithmetic values to the literal geometry of a positive-definite lattice. A quadratic form gives squared lengths; those lengths determine a lattice metric; the metric determines Voronoi cells.

Conway develops **vonorms** and **conorms** and interprets them geometrically. In dimensions two and three, they give an economical classification of positive-definite forms through the shape of the Voronoi cell and the existence of suitable obtuse superbases. The chapter also stresses the sharp contrast with indefinite forms in dimension at least three, whose classification is fundamentally arithmetic and leads toward genus and spinor genus.

For a type system, this chapter is a reminder that notions such as positive definiteness, norm, Gram data, Voronoi geometry, and lattice structure are related but not identical types.

### Afterthoughts — Feeling the Form of a Four-Dimensional Lattice

The tactile/Voronoi viewpoint is pushed into dimension four. The clean low-dimensional relationship between vanishing conorms and Voronoi-cell shape becomes more intricate, so the afterthoughts examine what survives and what needs refinement.

The main architectural lesson is that low-dimensional encodings should not be mistaken for the definition of a quadratic form itself. A representation convenient in dimensions two or three is an algorithmic layer over the more general object.

### Fourth Lecture — The Primary Fragrances

Conway turns from positive-definite geometry to arithmetic classification over the rationals. A rational quadratic form can be examined locally at every prime. Congruences modulo powers of primes lead to local invariants, including Conway's `p`-signatures and `p`-excesses.

These local data solve rational equivalence through the Hasse–Minkowski viewpoint: a global rational form is controlled by its behavior over the real place and the `p`-adic fields. The chapter develops the arithmetic ingredients needed for genus and, beyond it, the spinor-genus classification of indefinite integral forms.

This is another reason not to define `Quadratic Form` as merely a real symmetric matrix. Integral, rational, real, finite-field, and `p`-adic forms share a concept while supporting different invariants and algorithms.

### Afterthoughts — More About the Invariants: The p-Adic Numbers

The local theory is developed more explicitly. Conway explains the `p`-adic setting behind the invariants and uses `p`-adic Gauss means to establish invariance of the `p`-signatures or, equivalently, the `p`-excesses under rational equivalence.

The chapter makes the local-global structure operational: changing an integral representative should not change the local arithmetic information attached to the underlying rational form.

### Postscript — A Taste of Number Theory

The postscript uses the quadratic-form machinery to move quickly through several classical theorems. It proves quadratic reciprocity in terms of the Jacobi symbol, the divisibility by eight of the signature of an even unimodular quadratic form, and Legendre's three-squares theorem.

It then draws consequences for universal forms, includes a fast route to Gauss's theorem on triangular numbers, and discusses the Hasse–Minkowski principle and the obstruction to a rational positive-definite ternary form being universal.

## Idriç type-system implications

The book suggests a small mathematical family rather than one overloaded matrix type:

- `Bilinear Form`
- `Symmetric Bilinear Form`
- `Quadratic Form`
- `Sesquilinear Form`
- `Hermitian Form`
- refinements such as `Nondegenerate`, `Positive Definite`, and `Positive Semidefinite`

The form should be basis-independent. Matrix/Gram representations should require an explicit basis and should transform by congruence under basis change. In characteristic two, a quadratic form should remain primitive rather than being defined as a symmetric bilinear form in disguise; polarization does not retain all of the same information there.

For the complex visible-change metric used by the holomorphic explorer, the natural object is specifically a positive-semidefinite Hermitian form on coefficient displacements. Its Gram matrix can be cached for a fixed basis and sampling domain, but the cached matrix is an implementation of the form, not the type-level definition of the form.

## Sources for these notes

These summaries were written from the official publisher description and table of contents, JSTOR's chapter descriptions and previews, Cambridge Core chapter metadata/previews, and the Mathematical Association of America review. They intentionally paraphrase rather than reproduce the book.
