---
name: rdd
description: |
  Refactor Driven Design — systematic refactoring across TypeScript monorepos
  using codemods (ts-morph) and lint rules (oxlint/eslint). Use when the user
  wants to make structural changes across a codebase: renaming patterns, enforcing
  import boundaries, reorganizing file structures, migrating APIs, splitting
  modules, or enforcing architectural conventions. Also use when the user says
  "refactor", "codemod", "enforce", "migrate", "move all X to Y", "prevent X
  from importing Y", "split this module", or describes any systematic code
  transformation.
---

# Refactor Driven Design (RDD)

RDD is a methodology for sculpting a codebase by defining systematic
transformations and constraints, rather than applying individual changes by
hand.

The core idea: describe the _shape_ you want the code to take, then use
automation to get there and keep it there.

## Choosing the Right Tool

Every refactor starts with a decision: is this a one-time transformation, or a
permanent constraint?

### One-time transformation → ts-morph codemod

Use when there are many files to change and the transformation is mechanical. PR
reviewers review the _codemod script_, not every individual file change.

Examples:

- Rename all `getFoo` to `fetchFoo` across a package
- Add explicit Input/Output schemas to all tRPC procedures
- Move types from a barrel file into colocated files
- Split a feature folder into sub-directories

### Permanent enforcement → lint rule

Use when the convention must hold going forward, not just today. Default to
finding an existing rule before writing a custom one.

Examples:

- Prevent non-service folders from importing `sentry` directly
- Prevent raw HTML elements in React components (must use shadcn)
- Enforce import boundaries between packages
- Cap function length or nesting depth

**Existing rule** — preferred when a rule already covers the pattern. See the
`lints` skill for common patterns and configuration guidance (boundaries,
max-lines, restricted globals, etc.).

**Custom oxlint JS plugin** — when existing rules don't cover the pattern, or
when you need domain-specific error messages that explain _why_ the convention
exists.

### Hybrid approach

Sometimes both are needed: a codemod to fix all existing violations, plus a lint
rule to prevent regressions. Start with the lint rule (to define the
constraint), then write the codemod (to satisfy it).

---

## Workflow: ts-morph Codemod

### 1. Set up the codemod workspace

Create a `codemods/<name>/` directory at the repo root (or monorepo root). This
directory is the "safe zone" — it survives resets.

```
codemods/<name>/
├── codemod.ts        # the transformation script
├── tsconfig.json     # ts-morph needs this (can extend root tsconfig)
└── README.md         # what this codemod does and why (optional)
```

### 2. Project setup

ts-morph wraps the TypeScript compiler API. How you initialize the `Project`
depends on whether you need type information across package boundaries.

**Single package or structural transforms (no cross-package types needed):**

```ts
import { Project } from "ts-morph";

// -- Config --
const TARGET_DIRS = ["packages/core/src", "packages/api/src"];
// -------------

const project = new Project({
  skipAddingFilesFromTsConfig: true,
  compilerOptions: { jsx: 4 /* JsxEmit.ReactJSX */ },
});

for (const dir of TARGET_DIRS) {
  project.addSourceFilesAtPaths(`${dir}/**/*.{ts,tsx}`);
}
```

**Type-aware transforms in a monorepo (need correct type resolution per
package):**

Process each package independently with its own tsconfig. This ensures type
resolution is correct but means you can't resolve types across packages in a
single `Project`.

```ts
import { Project } from "ts-morph";

const PACKAGES = [
  { tsconfig: "packages/core/tsconfig.json", dirs: ["packages/core/src"] },
  { tsconfig: "packages/api/tsconfig.json", dirs: ["packages/api/src"] },
];

for (const pkg of PACKAGES) {
  const project = new Project({ tsConfigFilePath: pkg.tsconfig });
  for (const sourceFile of project.getSourceFiles()) {
    // ... type-aware transforms ...
  }
  project.saveSync();
}
```

### 3. Performance: analyze first, mutate second

ts-morph resets the TypeScript type checker between mutations. Interleaving type
queries with edits causes heavy re-computation. Collect all analysis results
first, then batch mutations.

```ts
// Phase 1: Analyze (read types, collect targets)
const targets: { file: SourceFile; node: Node; newName: string }[] = [];
for (const sourceFile of project.getSourceFiles()) {
  for (const decl of sourceFile.getFunctions()) {
    const returnType = decl.getReturnType().getText();
    if (returnType.startsWith("Promise<")) {
      targets.push({
        file: sourceFile,
        node: decl,
        newName: `${decl.getName()}Async`,
      });
    }
  }
}

// Phase 2: Mutate (batch all changes)
for (const { node, newName } of targets) {
  node.rename(newName); // updates all references automatically
}

project.saveSync();
```

Other performance tips:

- Use batch APIs: `addClasses([...])` instead of looping `addClass()`
- Call `sourceFile.forgetDescendants()` after processing large files to free
  memory
- Use `skipFileDependencyResolution: true` in Project options for faster init

### 4. Make it resettable

The iteration loop is: edit codemod → run → inspect → reset → repeat.

Reset means restoring only the _target directories_ to their last committed
state, while preserving the codemod workspace:

```ts
// codemods/<name>/reset.ts
import { execSync } from "child_process";

const TARGET_DIRS = ["packages/core/src", "packages/api/src"];

for (const dir of TARGET_DIRS) {
  execSync(`git checkout -- ${dir}`, { stdio: "inherit" });
}
console.log("Reset complete.");
```

Run the full cycle:

```sh
tsx codemods/<name>/reset.ts && tsx codemods/<name>/codemod.ts
```

### 5. Post-codemod: run the formatter

ts-morph mutations can drift formatting (indentation, trailing commas, etc.).
Don't fight this in the codemod — run the project's formatter as a post-step:

```sh
tsx codemods/<name>/codemod.ts && vp fmt
```

### 6. Iterate and ship

Run the codemod, inspect the diff, discuss what's wrong, fix the script, reset,
and run again. The goal is a clean diff that reviewers can trust by reading the
codemod script alone.

When the codemod is ready:

1. Commit the codemod script first (so reviewers can read it)
2. Run it one final time
3. Commit the resulting changes
4. Open a PR with both commits

After the PR merges, the `codemods/<name>/` directory can be kept (as
documentation) or deleted.

### ts-morph patterns

Common transformations:

```ts
// Rename a symbol across the project (updates all references)
const decl = sourceFile.getFunctionOrThrow("getFoo");
decl.rename("fetchFoo");

// Add a missing property to all objects matching a pattern
sourceFile
  .getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)
  .filter((obj) => obj.getProperty("input") && !obj.getProperty("output"))
  .forEach((obj) =>
    obj.addPropertyAssignment({
      name: "output",
      initializer: "z.void()",
    }),
  );

// Move declarations between files
const typeDef = sourceFile.getTypeAliasOrThrow("UserInput");
const targetFile = project.getSourceFileOrThrow("user.types.ts");
targetFile.addTypeAlias(typeDef.getStructure());
typeDef.remove();

// Rewrite imports
sourceFile
  .getImportDeclarations()
  .filter((imp) => imp.getModuleSpecifierValue() === "@sentry/node")
  .forEach((imp) => imp.setModuleSpecifier("@/services/analytics"));

// Add type-only import
sourceFile.addImportDeclaration({
  isTypeOnly: true,
  namedImports: ["UserInput"],
  moduleSpecifier: "./types",
});
```

Use https://ts-ast-viewer.com to explore AST structure before writing
transforms.

---

## Workflow: Lint Rule (Existing)

Use the `lints` skill for detailed guidance on configuring oxlint/eslint rules.
The high-level RDD workflow is:

1. **Identify the rule** that matches your constraint. Common ones:
   - `@boundaries/dependencies` — import boundaries between modules
   - `no-restricted-imports` / `no-restricted-globals` — block specific APIs
   - `max-lines-per-function`, `max-depth`, `max-params` — complexity limits

2. **Enable it repo-wide** and run the linter to see all violations:

   ```sh
   oxlint .   # or: vp lint
   ```

3. **Assess scope**: if there are many violations, consider writing a codemod
   (hybrid approach) to fix them in bulk before enforcing the rule.

4. **Fix violations** (manually, via codemod, or via `--fix` where supported).

5. **Verify** the linter passes cleanly, then commit the config change.

---

## Workflow: Custom Oxlint JS Plugin

Oxlint supports custom rules via its JS plugin system (alpha, ESLint
v9-compatible API). Use when no existing rule covers your pattern and you need
enforcement with domain-specific error messages.

Limitations to be aware of: JS plugins are alpha (API may change), no type-aware
linting (TypeScript type info not exposed to JS plugin rules), no custom parser
support (Vue/Svelte SFCs).

### 1. Create the plugin

Oxlint JS plugins use ESLint v9+ plugin structure. Create the plugin as a `.ts`
or `.js` file:

```ts
// lint-rules/no-raw-html-elements.ts
const plugin = {
  meta: { name: "local" },
  rules: {
    "no-raw-html-elements": {
      meta: {
        type: "problem" as const,
        docs: {
          description:
            "Disallow raw HTML elements in React components; use shadcn/ui instead",
        },
        messages: {
          noRawHtml:
            "Use a shadcn/ui component instead of <{{element}}>. " +
            "Raw HTML elements bypass the design system. " +
            "See: components/ui/ for available primitives.",
        },
      },
      create(context: any) {
        return {
          JSXOpeningElement(node: any) {
            const name = node.name.name;
            if (typeof name === "string" && /^[a-z]/.test(name)) {
              context.report({
                node,
                messageId: "noRawHtml",
                data: { element: name },
              });
            }
          },
        };
      },
    },
  },
};
export default plugin;
```

For better performance with the optimized oxlint API, use `@oxlint/plugins`:

```ts
import { eslintCompatPlugin } from "@oxlint/plugins";

const rule = {
  createOnce(context: any) {
    return {
      // before() runs at the start of each file; return false to skip
      before() {
        return true;
      },
      JSXOpeningElement(node: any) {
        const name = node.name.name;
        if (typeof name === "string" && /^[a-z]/.test(name)) {
          context.report({
            node,
            messageId: "noRawHtml",
            data: { element: name },
          });
        }
      },
      after() {
        /* optional cleanup */
      },
    };
  },
};

export default eslintCompatPlugin({
  meta: { name: "local" },
  rules: { "no-raw-html-elements": rule },
});
```

### 2. Wire it into the config

Register the plugin via `jsPlugins` in `.oxlintrc.json`:

```json
{
  "jsPlugins": ["./lint-rules/no-raw-html-elements.ts"],
  "rules": {
    "local/no-raw-html-elements": "error"
  }
}
```

Or in `oxlint.config.ts`:

```ts
import noRawHtml from "./lint-rules/no-raw-html-elements";

export default {
  jsPlugins: [noRawHtml],
  rules: {
    "local/no-raw-html-elements": "error",
  },
};
```

### 3. Add a test fixture

Create a fixture file that validates the rule catches what it should:

```tsx
// lint-rules/__tests__/no-raw-html-elements.fixture.tsx

// These SHOULD trigger the rule (expect lint errors):
const Bad1 = () => <div>hello</div>;
const Bad2 = () => <button onClick={fn}>click</button>;

// These should NOT trigger the rule:
import { Button } from "@/components/ui/button";
const Good1 = () => <Button onClick={fn}>click</Button>;
```

Run the linter against the fixture to verify:

```sh
oxlint lint-rules/__tests__/no-raw-html-elements.fixture.tsx
# Should report errors on Bad1 and Bad2, clean on Good1
```

### 4. Follow the same RDD cycle

Enable → run → assess violations → fix (codemod if needed) → verify.

### Sources

- [Oxlint JS Plugins docs](https://oxc.rs/docs/guide/usage/linter/js-plugins)
- [Writing JS Plugins guide](https://oxc.rs/docs/guide/usage/linter/writing-js-plugins)
- [@oxlint/plugins on npm](https://www.npmjs.com/package/@oxlint/plugins)

---

## Decision Checklist

When the user describes a refactor, walk through this:

1. **What's the change?** Understand the before/after shape.
2. **How many files?** If <5, manual edits may be fine. If 5+, consider a
   codemod.
3. **Should it be enforced going forward?**
   - No → codemod only
   - Yes → lint rule (+ codemod for existing violations if needed)
4. **Does an existing rule cover it?** Check oxlint/eslint rule catalogs and the
   `lints` skill first.
5. **Is a custom error message important?** If the "why" behind the rule is
   non-obvious, a custom rule with a descriptive message helps future
   developers.
