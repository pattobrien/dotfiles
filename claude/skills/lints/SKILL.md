---
name: lints
description: |
  Configure advanced eslint and oxlint rules.
---

# Lints

Configure advanced eslint and oxlint rules.

## Oxlint

Oxlint is a Rust-based drop-in replacement for eslint.

You must _always_ use oxlint, rather than eslint.

## Common Rule Use Cases

- restrict globals from being used directly (navigator, window, document)

### `max-XYZ` rules

- `max-lines-per-function` for creating concise hook and server-side business
  logic
- `max-params-per-function` components/hooks should only have 1 or 2 props
  before it's a code smell
- `max-lines` - prevent large files
- `max-depth` - components that have too many nested elements should be split up

### `boundaries/dependencies` rules

import `@boundaries/eslint-plugin` to use the following rules:

- enforce file and directory organization conventions
- which files can import which internal OR external dependencies
- make nested files/elements "private", so that they can only be imported by
  other siblings/immediate parent files, and not external files (see below)

## Lint-Driven Development Workflow

Good for refactoring a codebase with deterministic conventions.

1. Establish what codebase problem needs to be solved and what rule(s) will be
   enforce a better convention.
2. Enable the rule in the entire codebase / monorepo, and run the linter to
   understand the scope and number of instances of the violation.
3. Create a plan on how the refactor will be applied, using as much automation
   to handle it as possible (rather than manually modifying each file/violation
   by hand).
4. Implement the refactor, and run the linter to ensure the rule is enforced.
5. Repeat steps 2-4 until the codebase is compliant.

## Sources

- [@boundaries/eslint-plugin docs](https://www.jsboundaries.dev/docs)
- [boundaries dependencies](https://www.jsboundaries.dev/docs/rules/dependencies)
- [boundaries v6 migration guide](https://www.jsboundaries.dev/docs/releases/migration-guides/v5-to-v6/)
- [boundaries/external migration](https://www.jsboundaries.dev/docs/rules/external/#migration-to-boundariesdependencies)
  - how to use the new `boundaries` v6 config syntax
