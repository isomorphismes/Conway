# Agent instructions

Apply the shared evidence and acceptance guardrails in
`isomorphisms/ai-ci/AGENTS.md`.

Before changing this repository, read its README and repository-local
documentation, inspect the current branch/worktree and nearby active work, and
preserve established architecture, terminology, source/build layout, and
explicit current human corrections.

## Preserve Android update identity

The installable Conway Android wallpaper must keep its package name, persistent
test signer, and nondecreasing version code across builds. Do not let Gradle use
a runner-local debug key, and do not uninstall an existing copy to hide a signer
or downgrade mismatch. Replacement installation without uninstall is required
Android acceptance.

Keep this file repository-specific. Add local rules as the project develops; do
not copy the shared `ai-ci` rulebook here.
