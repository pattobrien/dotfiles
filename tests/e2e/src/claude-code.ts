import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { osc8Links, type Osc8Link } from "./osc8.ts";
import type { TermBackend } from "./term/backend.ts";
import type { TermlessSession } from "./term/termless.ts";
import { createTermlessBackend } from "./term/termless.ts";

export interface ClaudeCodeSession {
  /** Project cwd Claude Code was launched in (realpath). */
  cwd: string;
  /** Emulator running the Claude Code TUI — data plane for rendering asserts. */
  term: TermlessSession;
  /** Every OSC 8 hyperlink Claude Code has emitted so far. */
  links(): Osc8Link[];
  dispose(): Promise<void>;
}

export interface ClaudeCodeRenderOptions {
  cols?: number;
  rows?: number;
  backend?: TermBackend;
  /** Recording label (usually the test name). */
  label?: string;
  /** Screen text that marks the assistant message as fully rendered. */
  waitFor: string;
}

interface TranscriptEntry {
  parentUuid: string | null;
  isSidechain: false;
  type: "user" | "assistant";
  message: Record<string, unknown>;
  uuid: string;
  timestamp: string;
  userType: "external";
  cwd: string;
  sessionId: string;
}

function transcript(cwd: string, sessionId: string, assistantText: string) {
  const timestamp = new Date().toISOString();
  const userUuid = randomUUID();
  const entries: TranscriptEntry[] = [
    {
      parentUuid: null,
      isSidechain: false,
      type: "user",
      message: { role: "user", content: "render" },
      uuid: userUuid,
      timestamp,
      userType: "external",
      cwd,
      sessionId,
    },
    {
      parentUuid: userUuid,
      isSidechain: false,
      type: "assistant",
      message: {
        id: `msg_${sessionId.replaceAll("-", "")}`,
        type: "message",
        role: "assistant",
        model: "claude-fable-5-1",
        content: [{ type: "text", text: assistantText }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      },
      uuid: randomUUID(),
      timestamp,
      userType: "external",
      cwd,
      sessionId,
    },
  ];
  return entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
}

/**
 * Render one assistant message through the real Claude Code TUI and expose
 * the emulator it painted into.
 *
 * Claude Code is pointed at a throwaway CLAUDE_CONFIG_DIR seeded with
 * completed onboarding and a trusted project, and resumes a hand-written
 * transcript, so the message renders without login, trust dialogs, hooks,
 * plugins, MCP servers, or any API call, and nothing under ~/.claude is read
 * or written.
 */
export async function renderClaudeCodeMessage(
  assistantText: string,
  options: ClaudeCodeRenderOptions,
): Promise<ClaudeCodeSession> {
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "e2e-claude-code-")),
  );
  const cwd = path.join(root, "project");
  const configDir = path.join(root, "config");
  const sessionId = randomUUID();
  const projectDir = path.join(
    configDir,
    "projects",
    cwd.replaceAll(/[^a-zA-Z0-9]/g, "-"),
  );
  await fs.mkdir(cwd);
  await fs.mkdir(projectDir, { recursive: true });
  await fs.writeFile(
    path.join(configDir, ".claude.json"),
    JSON.stringify({
      hasCompletedOnboarding: true,
      theme: "dark",
      projects: {
        [cwd]: {
          hasTrustDialogAccepted: true,
          hasCompletedProjectOnboarding: true,
          allowedTools: [],
          mcpServers: {},
        },
      },
    }),
  );
  await fs.writeFile(
    path.join(projectDir, `${sessionId}.jsonl`),
    transcript(cwd, sessionId, assistantText),
  );

  const backend = options.backend ?? createTermlessBackend();
  const term = (await backend.launch(
    [
      "claude",
      "--resume",
      sessionId,
      "--strict-mcp-config",
      "--mcp-config",
      '{"mcpServers":{}}',
    ],
    {
      cols: options.cols ?? 120,
      rows: options.rows ?? 30,
      cwd,
      label: options.label ?? `claude-code-${sessionId.slice(0, 8)}`,
      env: {
        CLAUDE_CONFIG_DIR: configDir,
        DISABLE_AUTOUPDATER: "1",
        DISABLE_TELEMETRY: "1",
        DISABLE_ERROR_REPORTING: "1",
      },
    },
  )) as TermlessSession;

  try {
    await term.waitFor(options.waitFor, 15_000);
    await term.term.waitForStable(300, 5_000);
  } catch (error) {
    await term.dispose();
    await fs.rm(root, { recursive: true, force: true });
    throw new Error(
      `claude code never rendered "${options.waitFor}"\n--- screen ---\n${term.text()}`,
      { cause: error },
    );
  }

  return {
    cwd,
    term,
    links: () => osc8Links(term.raw()),
    async dispose() {
      await term.dispose();
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}
