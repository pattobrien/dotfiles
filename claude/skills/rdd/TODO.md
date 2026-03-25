# RDD Skill — Use Cases to Add

## Extract a Service SDK

Create an SDK wrapper for a 3rd party service in `src/services/<service-name>/*`.

### Steps

1. **Move 3rd party SDK code to service folder** with an optional wrapper around
   the base service.
   - Constructor initializes the SDK for the project — consumers don't need to
     parse env vars, supply baseUrls, or handle other init/config.
   - Re-export from the old location so this is not a breaking change.

2. **Define and export narrowed types/schemas** from
   `<service-name>/models/*` and resources/endpoints from
   `<service-name>/resources/*`.
   - Goal: narrow input and output types to only what you need to provide and
     return.
   - Example: for the Stripe SDK, a wrapper can abstract away `expand`able
     fields/keys and the type narrowing of those expanded fields, giving
     consumers a cleaner API.
   - Should not be a breaking change for consumers.

3. **Repo-wide import migration** — change all import statements to the new
   location.
   - Separate step/commit for import changes = doesn't muddy up previous
     commits.

4. **Enforce boundary** — prevent using the raw service package (e.g. `stripe`
   import) anywhere except `<service-name>/*`.

## Migrate Design System Colors

1. **Extract hardcoded color consts/vars** into a common dir/file.
   - Tailwind styles → `.css` file with CSS custom properties.
   - RN styles (components that don't yet support NativeWind) → `.ts` files.
   - (optional) Identify colors that are similar/identical enough to combine
     into one token.
   - (optional) Choose a unified color definition format (rgb, rgba, hsl,
     oklch, etc.).

2. **Import new tokens repo-wide** — replace all hardcoded color references with
   imports from the new token source.

## Bullet Notes

- **Migrate app to shadcn (or shadcn-like) component primitives** — rip out raw
  HTML elements and replace with design system components. Use visual snapshots
  (before/after) to validate that UI output is preserved even as code is
  completely rewritten.
  - Could include banning certain HTML elements via lint rule (e.g. no
    `<button>`, `<a>`, `<dialog>` — must use shadcn equivalents).

- **Refactor component names to use domain prefixes and common-component
  suffixes** — e.g. `TelehealthScreen`, `PortalProfileForm`,
  `WaterIntakeCard`. Establishes a naming convention where the prefix indicates
  the feature domain and the suffix indicates the component type (Screen, Form,
  Card, List, Dialog, etc.).
