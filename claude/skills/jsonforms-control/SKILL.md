---
name: jsonforms-control
description: Create new JSON Forms input components, control renderers, and debug form screens for the intake stepper system.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Agent
when_to_use: >
  Use when the user wants to create a new JSON Forms control or input renderer,
  add a field type to the intake form stepper, wire up an existing UI component
  as a JSON Forms control, or create a debug form screen.
  Examples: 'add a phone control', 'create a new renderer for X',
  'wire up the DatePicker as a control', 'add a debug form screen'.
argument-hint: "<field-name-or-component>"
arguments:
  - field_name
---

# JSON Forms Control Creation

Create new JSON Forms control renderers, optionally with input components, and
register them in the intake stepper system.

## Inputs

- `$field_name`: The field or component to create a control for (e.g. "email", "weight-ruler", "height-weight")

## Goal

A fully registered JSON Forms control that renders in the intake stepper, with
a proper ranked tester and (optionally) a dedicated input component.

## Key Paths

- **Input components**: `apps/expo/src/features/telehealth/intake/components/inputs/`
- **Control renderers**: `apps/expo/src/features/telehealth/intake/components/renderers/controls/`
- **Controls barrel**: `apps/expo/src/features/telehealth/intake/components/renderers/controls/index.ts`
- **Renderer registry**: `apps/expo/src/features/telehealth/intake/components/renderers/index.ts`
- **Debug form screens**: `apps/expo/src/screens/account/telegra-profile-debug-screen.tsx`
- **Shared UI components**: `apps/expo/src/shared/components/ui/` (DatePicker, RulerPicker, WheelPicker, etc.)
- **Feature components**: `apps/expo/src/features/weight/components/` (HeightWeight, etc.)
- **Zod-to-JSON-Schema util**: `packages/api/src/features/forms/utils/zod-to-json-schema.ts`

## Available JSON Forms Tester Utils

Import from `@jsonforms/core`:

| Function | Use when |
|---|---|
| `formatIs("date")` | JSON Schema has `format: "date"` |
| `schemaTypeIs("string")` | JSON Schema has `type: "string"` |
| `schemaMatches(predicate)` | Custom predicate on resolved schema |
| `optionIs("format", "X")` | UI schema control has `options.format === "X"` |
| `hasOption("name")` | UI schema control has a named option |
| `scopeEndsWith("/field")` | Control scope ends with a field name |
| `scopeEndIs("field")` | Last scope segment matches exactly |
| `isEnumControl` | Schema has `enum` |
| `isOneOfEnumControl` | Schema has `oneOf` with `const` entries |
| `isStringControl` | Schema type is string |
| `isNumberControl` | Schema type is number |
| `isDateControl` | Control with `format: "date"` |
| `isBooleanControl` | Schema type is boolean |
| `and(...testers)` | Logical AND |
| `or(...testers)` | Logical OR |
| `not(tester)` | Negate |
| `rankWith(rank, tester)` | Associate a rank with a tester |

### Rank conventions
- **1**: Fallback (e.g. `isStringControl` for generic text)
- **2**: Scope-based (e.g. `scopeEndsWith("/firstName")`)
- **3**: Format/type-based (e.g. `optionIs("format", "select")`, `formatIs("date")`)
- **4**: Specific override (e.g. `optionIs("format", "height-weight")`)

## Steps

### 1. Decide: new input component or reuse existing?

Check if an existing component can be used directly:
- Shared UI: `apps/expo/src/shared/components/ui/` (DatePicker, RulerPicker)
- Feature components: `apps/expo/src/features/weight/components/` (HeightWeight)
- Existing inputs: `apps/expo/src/features/telehealth/intake/components/inputs/`

If a new input is needed (e.g. for keyboard/autocomplete specialization), create
it in the inputs directory following this pattern:

```tsx
import type { BorderedInputProps } from "~/shared/components/ui/text-input";
import { MutedInput } from "~/shared/components/ui/text-input";

type MyInputProps = BorderedInputProps;

export function MyInput({ placeholder = "Label", className, ...props }: MyInputProps) {
  return (
    <MutedInput
      autoCapitalize="words"
      autoComplete="given-name"  // use appropriate autocomplete
      autoCorrect={false}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
}
```

**Success criteria**: Input component renders with correct keyboard type and autocomplete.

### 2. Create the Control renderer

Create a file in `apps/expo/src/features/telehealth/intake/components/renderers/controls/`.

Choose the right tester based on how the field should be detected:
- **By JSON Schema format**: `formatIs("email")` or pre-built like `isDateControl`
- **By JSON Schema type**: `isEnumControl`, `isOneOfEnumControl`, `isNumberControl`
- **By UI schema option**: `optionIs("format", "my-format")`
- **By scope/field name**: `scopeEndsWith("/fieldName")`
- **Combined**: `or(optionIs("format", "X"), scopeEndsWith("/Y"))`

Pattern:

```tsx
import type { ControlProps, RankedTester } from "@jsonforms/core";
import { rankWith, /* tester */ } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";

import { MyInput } from "../../inputs/my-input";
import { ControlWrapper } from "./control-wrapper";

function MyControl(props: ControlProps) {
  if (!props.visible) return null;

  return (
    <ControlWrapper {...props}>
      <MyInput
        value={(props.data as string | undefined) ?? ""}
        onChangeText={(text) => props.handleChange(props.path, text)}
      />
    </ControlWrapper>
  );
}

export const myControlTester: RankedTester = rankWith(3, /* tester */);
export const MyControlRenderer = withJsonFormsControlProps(MyControl);
```

**Rules**:
- Hook calls (`useJsonForms()`, etc.) MUST come before any early returns (`if (!props.visible)`) — React Compiler requires consistent hook ordering.
- For controls managing multiple fields, use `useJsonForms()` to access sibling data.
- Export naming: `{name}ControlTester` and `{Name}ControlRenderer`.

**Success criteria**: Control file exports a tester and renderer.

### 3. Register the control

1. Add exports to `controls/index.ts` (alphabetical order)
2. Add import and entry to `intakeRenderers` array in `renderers/index.ts`
   - Place before `textControlFallbackTester` (the catch-all at the bottom)

**Success criteria**: `pnpm lint` passes with no errors in the new files.

### 4. (Optional) Add to a debug form screen

To test the control, add it to a debug screen's UI schema:

```tsx
// In the uiSchema categories array:
{
  type: "Category",
  label: "My Field",
  elements: [
    { type: "Control", scope: "#/properties/myField" },
    // Or with options to trigger a specific control:
    { type: "Control", scope: "#/properties/myField", options: { format: "my-format" } },
  ],
},
```

If the JSON Schema comes from a Zod schema, use `zodSchemaToJsonSchema()` from
`@meagain/api/features/forms/utils/zod-to-json-schema` which auto-converts
enums to `oneOf+const` and strips date patterns.

**Success criteria**: Field renders with the correct control in the stepper.
