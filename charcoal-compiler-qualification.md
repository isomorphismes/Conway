# Preserve qualified ICK compilation

Charcoal source fc9398363e7dbc9f7bcca36bcdb4bf983a6bd27f reaches the inherited
ICK Android qualification boundary in run41970070060. ARM64 and x86_64 fail
before Conway compilation: the compiler emits `.base64` in its Unicode glyph
probe, which the declared NDK29 assembler rejects. ARMv7 passes.

Promote the shared, already-qualified assembler-capability producer to ai-ci
f6d825d15cd3c0c34ae1b43240a463ff5d343090. Preserve NDK29, fortified Bionic,
all three ABIs, owned-C compilation through ICK, linker-only NDK use, stable
package/signer and same-candidate replacement acceptance. Archive compiler stages
through the matching metadata-bound archive-stage target and restore them through
the same pinned provider. No source compiler fallback or emitted-assembly edit.

Fresh compilation, signing and Android execution must qualify the promoted
source. The former run's compiler failures are not application visual failures.
