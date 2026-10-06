import fs from "node:fs/promises";
import net from "node:net";

const PREFIX = "\x1bP@kitty-cmd";
const SUFFIX = "\x1b\\";
const VERSION = [0, 26, 0];

interface Reply {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface LaunchOptions {
  title: string;
  cwd: string;
  position: string;
}

export interface KittyRc {
  socketPath: string;
  getText: (match: string) => Promise<string | undefined>;
  sendText: (match: string, text: string) => Promise<void>;
  launchOsWindow: (options: LaunchOptions) => Promise<number>;
  closeWindow: (match: string) => Promise<boolean>;
  windowExists: (match: string) => Promise<boolean>;
}

export async function findKittySocket(): Promise<string> {
  const sockets = (await fs.readdir("/tmp")).filter((e) =>
    /^kitty-\d+$/.test(e),
  );
  if (sockets.length !== 1) {
    throw new Error(
      `expected exactly one /tmp/kitty-<pid> socket, found [${sockets.join(", ")}]; pass --to unix:/tmp/kitty-<pid>`,
    );
  }
  return `unix:/tmp/${sockets[0]}`;
}

export function createKittyRc(to: string): KittyRc {
  const socketPath = to.replace(/^unix:/, "");

  function request(
    cmd: string,
    payload: Record<string, unknown>,
  ): Promise<Reply> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection(socketPath);
      let buf = "";
      sock.setEncoding("utf8");
      sock.on("connect", () => {
        sock.write(
          `${PREFIX}${JSON.stringify({ cmd, version: VERSION, payload })}${SUFFIX}`,
        );
      });
      sock.on("data", (chunk: string) => {
        buf += chunk;
        if (buf.endsWith(SUFFIX)) {
          sock.end();
          resolve(
            JSON.parse(buf.slice(PREFIX.length, -SUFFIX.length)) as Reply,
          );
        }
      });
      sock.on("error", reject);
    });
  }

  function fire(cmd: string, payload: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection(socketPath);
      sock.on("connect", () => {
        sock.end(
          `${PREFIX}${JSON.stringify({ cmd, version: VERSION, no_response: true, payload })}${SUFFIX}`,
          () => resolve(),
        );
      });
      sock.on("error", reject);
    });
  }

  return {
    socketPath,

    async getText(match) {
      const reply = await request("get-text", { match, extent: "screen" });
      return reply.ok ? String(reply.data) : undefined;
    },

    async sendText(match, text) {
      await fire("send-text", {
        match,
        data: `base64:${Buffer.from(text).toString("base64")}`,
        bracketed_paste: "disable",
      });
    },

    async launchOsWindow({ title, cwd, position }) {
      const [left, top] = position.split("x");
      const reply = await request("launch", {
        type: "os-panel",
        keep_focus: true,
        location: "default",
        stdin_source: "none",
        logo_alpha: -1,
        window_title: title,
        os_window_title: title,
        os_panel: [
          "edge=none",
          "layer=top",
          "focus-policy=not-allowed",
          `margin-left=${left}`,
          `margin-top=${top}`,
          "columns=100",
          "lines=24",
        ],
        cwd,
      });
      if (!reply.ok) throw new Error(`kitty launch failed: ${reply.error}`);
      return Number(reply.data);
    },

    async closeWindow(match) {
      const reply = await request("close-window", { match });
      return reply.ok;
    },

    async windowExists(match) {
      const reply = await request("ls", { match, output_format: "json" });
      return reply.ok;
    },
  };
}
