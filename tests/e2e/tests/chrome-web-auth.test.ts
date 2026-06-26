import {
  CLIENT_REDIRECT_SETTLE_MS,
  assertClaudeSecurityVerificationIsNotBlocking,
  expect,
  goto,
  readBodyText,
  test,
  waitForBodyText,
  waitForUrlMatchOrContinue,
} from "./chrome-web-auth.fixtures.ts";

const TEST_TIMEOUT_MS = 90_000;

test(
  "Chrome GitHub session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://github.com/");
    const header = chromePage.locator("header").first();
    await header.waitFor({ state: "visible", timeout: 30_000 });

    const headerText = await header.innerText();
    expect(headerText, "GitHub header should not show a logged-out Sign in link").not.toMatch(
      /\bSign in\b/,
    );
  },
);

test(
  "Chrome Spotify web session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://open.spotify.com/");

    const bodyText = await waitForBodyText(chromePage);
    expect(bodyText, "Spotify should not show a logged-out Log in action").not.toMatch(
      /\bLog in\b/,
    );
  },
);

test(
  "Chrome Claude web session opens a new chat",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://claude.ai/");
    await chromePage.waitForTimeout(2_000);
    await assertClaudeSecurityVerificationIsNotBlocking(chromePage);
    await waitForUrlMatchOrContinue(chromePage, /claude\.ai\/(?:new|login)(?:[/?#]|$)/, 10_000);
    await assertClaudeSecurityVerificationIsNotBlocking(chromePage);

    expect(chromePage.url(), "Claude should not redirect to the login route").not.toMatch(
      /^https:\/\/claude\.ai\/login(?:[/?#]|$)/,
    );
    expect(chromePage.url(), "Claude should open the signed-in new-chat route").toMatch(
      /^https:\/\/claude\.ai\/new(?:[/?#]|$)/,
    );
  },
);

test(
  "Chrome Cursor dashboard session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://cursor.com/dashboard");
    await chromePage.waitForLoadState("domcontentloaded", { timeout: 30_000 });
    await chromePage.waitForTimeout(CLIENT_REDIRECT_SETTLE_MS);

    expect(
      chromePage.url(),
      "Cursor dashboard should not redirect to authenticator.cursor.sh",
    ).not.toMatch(/^https:\/\/authenticator\.cursor\.sh(?:[/?#]|$)/);
  },
);

test(
  "Chrome Figma settings session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://www.figma.com/settings");
    await waitForUrlMatchOrContinue(
      chromePage,
      /figma\.com\/(?:settings|login)(?:[/?#]|$)/,
      10_000,
    );

    expect(chromePage.url(), "Figma settings should not redirect to the login route").not.toMatch(
      /^https:\/\/www\.figma\.com\/login(?:[/?#]|$)/,
    );
    expect(chromePage.url(), "Figma should open the signed-in settings route").toMatch(
      /^https:\/\/www\.figma\.com\/settings(?:[/?#]|$)/,
    );

    const bodyText = await readBodyText(chromePage);
    if (bodyText.length > 0) {
      expect(bodyText, "Figma should not show the logged-out login form").not.toMatch(
        /Sign in to Figma|No account\? Create one|EMAIL[\s\S]*PASSWORD[\s\S]*Log in/,
      );
    }
  },
);

test(
  "Chrome Vercel account settings session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://vercel.com/account/settings/tokens");
    await waitForUrlMatchOrContinue(
      chromePage,
      /vercel\.com\/(?:account\/settings\/tokens|login)(?:[/?#]|$)/,
      10_000,
    );

    const bodyText = await waitForBodyText(chromePage);
    expect(chromePage.url(), "Vercel account settings should not redirect to login").not.toMatch(
      /^https:\/\/vercel\.com\/login(?:[/?#]|$)/,
    );
    expect(bodyText, "Vercel should not show the logged-out login form").not.toMatch(
      /Log in to Vercel|Continue with (Email|GitHub|Google|Apple|SAML SSO|Passkey)/,
    );
  },
);

test(
  "Chrome Linear app session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://linear.app/settings/account/profile");
    await chromePage.waitForTimeout(CLIENT_REDIRECT_SETTLE_MS);

    const bodyText = await waitForBodyText(chromePage);
    expect(chromePage.url(), "Linear should not open the login route").not.toMatch(
      /^https:\/\/linear\.app\/login(?:[/?#]|$)/,
    );
    expect(bodyText, "Linear should not stay on a logged-out login shell").not.toMatch(
      /\bLog in\b|Continue with Google|Continue with SAML/i,
    );
    expect(bodyText, "Linear should not stay on an unauthenticated loading shell").not.toBe(
      "Loading…",
    );
  },
);

test(
  "Chrome Neon console session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://console.neon.tech/app/settings");
    await chromePage.waitForTimeout(CLIENT_REDIRECT_SETTLE_MS);

    const bodyText = await waitForBodyText(chromePage);
    expect(chromePage.url(), "Neon console should not redirect to Keycloak auth").not.toContain(
      "/protocol/openid-connect/auth",
    );
    expect(bodyText, "Neon console should not show the logged-out login form").not.toMatch(
      /Log in to Neon|\bLog in\b|New to Neon\?/,
    );
  },
);

test(
  "Chrome Raycast web session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://www.raycast.com/users/sign_in");
    await chromePage.waitForTimeout(CLIENT_REDIRECT_SETTLE_MS);

    const bodyText = await waitForBodyText(chromePage);
    expect(chromePage.url(), "Raycast should not remain on the sign-in route").not.toMatch(
      /^https:\/\/www\.raycast\.com\/users\/sign_in(?:[/?#]|$)/,
    );
    expect(bodyText, "Raycast should not show the logged-out login form").not.toMatch(
      /Log in to Raycast|Don't have an account\? Sign up|Send Magic Link/,
    );
  },
);

test(
  "Chrome ChatGPT web session is already signed in",
  { tags: ["apps", "macos-gui", "setup-validation"], timeout: TEST_TIMEOUT_MS },
  async ({ chromePage }) => {
    await goto(chromePage, "https://chatgpt.com/gpts");
    await chromePage.waitForTimeout(CLIENT_REDIRECT_SETTLE_MS);

    const bodyText = await readBodyText(chromePage);
    const title = await chromePage.title();
    expect(chromePage.url(), "ChatGPT should not redirect to an auth route").not.toMatch(
      /^https:\/\/chatgpt\.com\/(?:auth|login)(?:[/?#]|$)/,
    );
    expect(title, "ChatGPT should not be blocked by a bot-check interstitial").not.toMatch(
      /Just a moment/i,
    );
    expect(bodyText.trim().length, "ChatGPT GPTs page should render body text").toBeGreaterThan(0);
    expect(bodyText, "ChatGPT should not show logged-out GPTs/login actions").not.toMatch(
      /\bLog in\b|Sign up for free|Error loading GPTs|Log in to get answers based on saved chats/,
    );
  },
);
