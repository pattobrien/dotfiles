#!/usr/bin/env bun

import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { $ } from "bun";
import { z } from "zod";

const home = homedir();
const paths = {
  omniwm: join(home, ".config/omniwm/settings.toml"),
  nvimKeymaps: join(home, ".config/nvim/lua/config/keymaps.lua"),
  nvimPlugins: join(home, ".config/nvim/lua/plugins"),
  nvimDump: join(home, ".local/state/nvim/keylog/keymaps.json"),
  herdr: join(home, ".config/herdr/config.toml"),
  herdrPlusActions: join(home, ".config/herdr-plus/quick-actions"),
  kitty: join(home, ".config/kitty/kitty.conf"),
};

const tools = ["omniwm", "nvim", "herdr", "kitty"] as const;
type Tool = (typeof tools)[number];

const section = (path: string, source: string) =>
  `### ${path}\n\n${source.trim()}\n`;

const gestureKeys: Record<string, string> = {
  mouseMoveModifierKey:
    "hold this modifier and left-click-drag a tiled window onto another to swap them, in both layouts; on Niri add Shift to insert into a column instead; off disables it",
  mouseResizeModifierKey:
    "hold this modifier and right-click-drag a tiled window to resize it",
  scrollModifierKey:
    "hold this modifier and scroll the mouse wheel to scroll Niri columns",
  scrollEnabled:
    "trackpad column scrolling with fingerCount fingers, and modifier + wheel scrolling",
  fingerCount: "trackpad column-scroll finger count",
  workspaceSwipeEnabled:
    "trackpad swipe with workspaceSwipeFingerCount fingers along workspaceSwipeAxis switches workspace",
  overviewGestureEnabled:
    "trackpad swipe up with overviewGestureFingerCount fingers opens Overview, swipe down closes it",
  windowMoveEnabled:
    "trackpad-only: drag with windowMoveFingerCount fingers, without clicking, to swap the tiled window under the cursor; unrelated to mouseMoveModifierKey",
  windowResizeEnabled:
    "trackpad-only: drag with windowResizeFingerCount fingers, without clicking, to resize the tiled window under the cursor; unrelated to mouseResizeModifierKey",
};

const annotateGestures = (block: string) =>
  block
    .split("\n")
    .map((line) => {
      const key = line.split(" = ")[0];
      const note = gestureKeys[key];
      return note ? `${line}  # ${note}` : line;
    })
    .join("\n");

const omniwm = async () => {
  const source = await readFile(paths.omniwm, "utf8");
  const keep = /^\[(general|gestures)\]|^\[\[hotkeys\]\]/;
  const blocks = source
    .split(/\n(?=\[)/)
    .filter((block) => keep.test(block))
    .filter((block) => !block.includes('binding = "Unassigned"'))
    .map((block) =>
      block.startsWith("[gestures]") ? annotateGestures(block) : block,
    );
  return section(paths.omniwm, blocks.join("\n"));
};

type Keymap = {
  lhs: string;
  mode: string;
  desc?: string;
  plugin?: string;
  src?: string;
};

const nvim = async () => {
  const keymaps = await readFile(paths.nvimKeymaps, "utf8");
  const pluginFiles = (await readdir(paths.nvimPlugins)).filter((f) =>
    f.endsWith(".lua"),
  );
  const plugins = await Promise.all(
    pluginFiles.map(async (file) => {
      const path = join(paths.nvimPlugins, file);
      const source = await readFile(path, "utf8");
      return source.includes("keys") ? section(path, source) : "";
    }),
  );
  const dump = JSON.parse(await readFile(paths.nvimDump, "utf8")) as {
    generated: string;
    global: Keymap[];
    lazy: Keymap[];
    lsp: Keymap[];
  };
  const groups = { global: dump.global, lazy: dump.lazy, lsp: dump.lsp };
  const rows = Object.entries(groups).flatMap(([group, maps]) =>
    maps.map(
      (map) =>
        `${group}\t${map.mode}\t${map.lhs.replace(/^ /, "<leader>")}\t${map.desc ?? ""}\t${map.plugin ?? ""}`,
    ),
  );
  return [
    section(paths.nvimKeymaps, keymaps),
    ...plugins,
    section(
      paths.nvimDump,
      `Effective keymaps from :KeylogDump at ${dump.generated} (group, mode, lhs, desc, plugin). <leader> is space.\n${rows.join("\n")}`,
    ),
  ].join("\n");
};

const herdr = async () => {
  const config = await readFile(paths.herdr, "utf8");
  const start = config.indexOf("\n[keys]");
  const keys = config.slice(start === -1 ? 0 : start + 1);
  const actionFiles = await readdir(paths.herdrPlusActions).catch(
    () => [] as string[],
  );
  const actions = await Promise.all(
    actionFiles
      .filter((f) => f.endsWith(".toml"))
      .map(async (file) => {
        const path = join(paths.herdrPlusActions, file);
        return section(path, await readFile(path, "utf8"));
      }),
  );
  return [section(paths.herdr, keys), ...actions].join("\n");
};

const kitty = async () => {
  const source = await readFile(paths.kitty, "utf8");
  const maps = source
    .split("\n")
    .filter((line) => /^(map|mouse_map) /.test(line));
  return section(
    paths.kitty,
    `Cmd chords are relayed to herdr as F-key escape sequences; match the sequence against herdr's [keys].\n${maps.join("\n")}`,
  );
};

const readers: Record<Tool, () => Promise<string>> = {
  omniwm,
  nvim,
  herdr,
  kitty,
};

const server = new McpServer({ name: "hotkeys", version: "1.0.0" });

server.registerTool(
  "read_keybindings",
  {
    title: "Read keybindings",
    description:
      "Returns the user's live keybinding configuration for one tool: omniwm (window manager; Hyper = Ctrl+Opt+Cmd, Right Option tap), nvim (LazyVim keymaps plus the effective keymap dump), herdr (terminal multiplexer prefix and direct bindings plus herdr-plus quick actions), or kitty (terminal relays of Cmd chords to herdr).",
    inputSchema: { tool: z.enum(tools) },
  },
  async ({ tool }) => ({
    content: [{ type: "text", text: await readers[tool]() }],
  }),
);

server.registerTool(
  "omniwm_state",
  {
    title: "OmniWM state",
    description:
      "Live OmniWM state: every workspace with its layout and window counts, the visible windows with app, title, workspace and frame, and the focused window.",
    inputSchema: {},
  },
  async () => {
    const [workspaces, windows, focused] = await Promise.all([
      $`omniwmctl query workspaces --format json`.text(),
      $`omniwmctl query windows --visible --format json`.text(),
      $`omniwmctl query focused-window --format json`.text(),
    ]);
    return {
      content: [
        {
          type: "text",
          text: `workspaces:\n${workspaces}\nvisible windows:\n${windows}\nfocused window:\n${focused}`,
        },
      ],
    };
  },
);

server.registerTool(
  "herdr_state",
  {
    title: "herdr state",
    description:
      "Live herdr state: every workspace with its worktree and focus, plus the tabs and panes of the focused workspace.",
    inputSchema: {},
  },
  async () => {
    const list = await $`herdr workspace list`.json();
    const focused = list.result.workspaces.find(
      (w: { focused: boolean }) => w.focused,
    );
    const id = focused?.workspace_id;
    const [tabs, panes] = id
      ? await Promise.all([
          $`herdr tab list --workspace ${id}`.text(),
          $`herdr pane list --workspace ${id}`.text(),
        ])
      : ["", ""];
    return {
      content: [
        {
          type: "text",
          text: `workspaces:\n${JSON.stringify(list.result.workspaces)}\nfocused workspace tabs:\n${tabs}\nfocused workspace panes:\n${panes}`,
        },
      ],
    };
  },
);

await server.connect(new StdioServerTransport());
