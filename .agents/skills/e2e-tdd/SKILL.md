---
name: e2e-tdd
description:
  Add new use cases and features to a codebase by first creating (failing) e2e
  tests. Use when the user mentions a new use case or feature, or
  "e2e"/"end-to-end" testing.
# license: TODO_LICENSE # e.g. Apache-2.0, MIT, or path to LICENSE file
# compatibility: TODO_COMPATIBILITY # e.g. "Requires Node.js 22+ and vp"
# metadata:
#   author: TODO_AUTHOR
#   version: "1.0"
# allowed-tools: TODO_TOOLS # space-separated string, e.g. "Bash(vp:*) Read"
---

# E2E TDD

Add new use cases to a codebase by first starting with end-to-end tests that
capture the use case's high level behavior, even if the tests fail at first
(which they _should_ fail, when working on new feature or use case development).

## Philosophy

Using this methodology, you can ensure that we define robust goals before
writing any implementation code. Getting a green test should give us 100%
confidence that the use case will work in production; therefore, mocks should
NOT be used.

## Workflow

1. Write an end-to-end test that captures the high level behavior of the use
   case you're trying to implement. This test should be as specific as possible
   about the expected behavior, and should fail when you run it (since you
   haven't implemented the feature yet).

   Optionally, fixtures may need to be created if a new service / API needs to
   be used, or if

2. Run the test to confirm that it fails, which validates that the test is
   correctly capturing the intended behavior and that the feature is not yet
   implemented.

3. Have another subagent evaluate the e2e test, to ensure its not incorrectly
   designed (e.g. too vague, using fake data or mocks instead of real data,
   etc.)

## Anti-Patterns

- **USING MOCKS**: Tests should run against real APIs (albeit, staging
  environments are fine) and with real data; mocks can easily be designed to
  pass without reflecting reality, so they are absolutely never permitted

## Examples

See existing tests by searching for `e2e` in the codebase.

Good e2e tests have the following characteristics:

- assert the negative cases, e.g. at the start of the test, to ensure no poor
  test design results in false successes
- explicitly assert the expected behavior between steps, instead of only using
  interractions
  - e.g. assert that a page's heading testId is visible before clicking a button
    on the page
- where applicable, use other fixtures (like backend services) to assert data
  expectations
  - e.g. in a account-creation test, assert that an account with the test email
    doesnt exist at the start of the test, and then assert that it _does_ exist
    at the end of the test, in addition to asserting that the UI shows the
    expected success message

## Resources

### Vitest Docs

- [Using Matchers](https://main.vitest.dev/guide/learn/matchers.md)
- [Testing Asynchronous Code](https://main.vitest.dev/guide/learn/asynchronous.md)

### Appium Docs

Use whenever writing mobile e2e tests.

- [Migrating to Appium 3](https://appium.io/docs/en/3.1/guides/migrating-2-to-3/)

### WebdriverIO Docs

- [Mobile commands](https://webdriver.io/docs/api/mobile/) and [Appium protocol](https://webdriver.io/docs/api/appium/) — prefer `tap` over `click`, use `~accessibilityId` selectors
- When unsure how to do something with WDIO, ask Context7 (`resolve-library-id` → `query-docs`) before guessing
