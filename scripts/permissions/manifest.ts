export type Target = "local" | "devbox" | "display";

export type TccClient = { bundleId: string } | { path: string };

export type TccService =
  | "Accessibility"
  | "ScreenCapture"
  | "PostEvent"
  | "SystemPolicyAllFiles";

export type Probe =
  | { kind: "tcc"; service: TccService; client: TccClient }
  | { kind: "appleEvents"; client: TccClient; target: string }
  | { kind: "sysext"; teamId: string; bundleId: string }
  | { kind: "backgroundItem"; identifier: string; scope: BtmScope }
  | { kind: "localNetwork"; signingId: string }
  | { kind: "notifications"; bundleId: string }
  | { kind: "replaydApproval"; client: string }
  | { kind: "pmset"; setting: string; value: number }
  | {
      kind: "defaults";
      domain: string;
      key: string;
      currentHost: boolean;
      equals: string;
    }
  | { kind: "xcodeFirstLaunch" }
  | { kind: "command"; argv: string[]; expect: RegExp };

export type BtmScope = "user" | "system";

export type Remedy =
  | { by: "boot"; step: string }
  | { by: "manual"; where: string }
  | { by: "command"; run: string };

export type Entry = {
  name: string;
  probe: Probe;
  remedy: Partial<Record<Target, Remedy>>;
};

export const vmguest = "/opt/namespace/vmguest";
export const tinycastDev = "com.tinycast.app.dev";

const settings = (where: string): Remedy => ({
  by: "manual",
  where: `System Settings > ${where}`,
});
const privacy = (pane: string) => settings(`Privacy & Security > ${pane}`);
const boot = (step: string): Remedy => ({ by: "boot", step });

const paneOf: Record<TccService, string> = {
  Accessibility: "Accessibility",
  ScreenCapture: "Screen & System Audio Recording",
  PostEvent: "Accessibility",
  SystemPolicyAllFiles: "Full Disk Access",
};

const tcc = (
  name: string,
  service: TccService,
  client: TccClient,
  remedy: Entry["remedy"] = { local: privacy(paneOf[service]) },
): Entry => ({ name, probe: { kind: "tcc", service, client }, remedy });

const kitty = { bundleId: "net.kovidgoyal.kitty" };
const onePassword = { bundleId: "com.1password.1password" };
const claude = { bundleId: "com.anthropic.claudefordesktop" };
const thaw = { bundleId: "com.stonerl.Thaw" };
const vmguestClient = { path: vmguest };

const neverSleep = (name: string, probe: Probe): Entry => ({
  name,
  probe,
  remedy: { devbox: boot("never sleep") },
});

export const manifest: Entry[] = [
  tcc("kitty Accessibility", "Accessibility", kitty),
  tcc("kitty Screen Recording", "ScreenCapture", kitty),
  tcc("kitty Full Disk Access", "SystemPolicyAllFiles", kitty),
  {
    name: "kitty Automation of System Events",
    probe: {
      kind: "appleEvents",
      client: kitty,
      target: "com.apple.systemevents",
    },
    remedy: { local: privacy("Automation > kitty > System Events") },
  },
  tcc("Hammerspoon Accessibility", "Accessibility", {
    bundleId: "org.hammerspoon.Hammerspoon",
  }),
  tcc("Karabiner-Core-Service Accessibility", "Accessibility", {
    bundleId: "org.pqrs.Karabiner-Core-Service",
  }),
  tcc("Thaw Accessibility", "Accessibility", thaw),
  tcc("Thaw Screen Recording", "ScreenCapture", thaw),
  tcc("superwhisper Accessibility", "Accessibility", {
    bundleId: "com.superduper.superwhisper",
  }),
  tcc("Raycast Accessibility", "Accessibility", {
    bundleId: "com.raycast.macos",
  }),
  tcc("Homerow Accessibility", "Accessibility", {
    bundleId: "com.superultra.Homerow",
  }),
  tcc("1Password Accessibility", "Accessibility", onePassword),
  tcc("1Password Screen Recording", "ScreenCapture", onePassword),
  tcc("Claude Accessibility", "Accessibility", claude),
  tcc("Claude Screen Recording", "ScreenCapture", claude),
  tcc("Tinycast Accessibility", "Accessibility", {
    bundleId: "com.tinycast.app",
  }),
  tcc(
    "Tinycast dev Accessibility",
    "Accessibility",
    { bundleId: tinycastDev },
    { local: privacy("Accessibility"), devbox: boot("tcc grants") },
  ),
  tcc("Tinycast dev Post Event", "PostEvent", { bundleId: tinycastDev }),
  tcc("vmguest Screen Recording", "ScreenCapture", vmguestClient, {
    display: boot("tcc grants"),
  }),
  tcc("vmguest Accessibility", "Accessibility", vmguestClient, {
    display: boot("tcc grants"),
  }),
  tcc("vmguest Post Event", "PostEvent", vmguestClient, {
    display: boot("tcc grants"),
  }),
  {
    name: "vmguest private window picker approval",
    probe: { kind: "replaydApproval", client: vmguest },
    remedy: { display: boot("screen-capture approval") },
  },
  {
    name: "Karabiner VirtualHIDDevice driver extension",
    probe: {
      kind: "sysext",
      teamId: "G43BCU2T37",
      bundleId: "org.pqrs.Karabiner-DriverKit-VirtualHIDDevice",
    },
    remedy: {
      local: settings("General > Login Items & Extensions > Driver Extensions"),
    },
  },
  {
    name: "Tailscale network extension",
    probe: {
      kind: "sysext",
      teamId: "W5364U7YZB",
      bundleId: "io.tailscale.ipn.macsys.network-extension",
    },
    remedy: {
      local: settings(
        "General > Login Items & Extensions > Network Extensions",
      ),
    },
  },
  ...(
    [
      ["16.org.pqrs.service.daemon.Karabiner-Core-Service", "system"],
      [
        "16.org.pqrs.service.daemon.Karabiner-VirtualHIDDevice-Daemon",
        "system",
      ],
      ["2.org.hammerspoon.Hammerspoon", "user"],
    ] satisfies [string, BtmScope][]
  ).map(([identifier, scope]): Entry => ({
    name: `background item ${identifier}`,
    probe: { kind: "backgroundItem", identifier, scope },
    remedy: { local: settings("General > Login Items & Extensions") },
  })),
  ...["net.kovidgoyal.kitty", "com.tinycast.app"].map((signingId): Entry => ({
    name: `${signingId} Local Network`,
    probe: { kind: "localNetwork", signingId },
    remedy: { local: privacy("Local Network") },
  })),
  ...["net.kovidgoyal.kitty", "com.777genius.agent-notifications"].map(
    (bundleId): Entry => ({
      name: `${bundleId} notifications`,
      probe: { kind: "notifications", bundleId },
      remedy: { local: settings("Notifications") },
    }),
  ),
  {
    name: "Xcode first launch",
    probe: { kind: "xcodeFirstLaunch" },
    remedy: {
      local: { by: "command", run: "sudo xcodebuild -runFirstLaunch" },
    },
  },
  {
    name: "SIP disabled",
    probe: {
      kind: "command",
      argv: ["csrutil", "status"],
      expect: /status: disabled\./,
    },
    remedy: {
      devbox: {
        by: "manual",
        where: "the Namespace image; csrutil disable runs only in Recovery",
      },
    },
  },
  ...["sleep", "displaysleep", "disksleep"].map((setting) =>
    neverSleep(`pmset ${setting} 0`, { kind: "pmset", setting, value: 0 }),
  ),
  ...[true, false].map((currentHost) =>
    neverSleep(`screensaver idleTime 0${currentHost ? " (currentHost)" : ""}`, {
      kind: "defaults",
      domain: "com.apple.screensaver",
      key: "idleTime",
      currentHost,
      equals: "0",
    }),
  ),
];

export const bootTccGrants = (targets: Target[]) =>
  manifest.flatMap(({ probe, remedy }) =>
    probe.kind === "tcc" &&
    targets.some((target) => remedy[target]?.by === "boot")
      ? [probe]
      : [],
  );

export const targetsFor = (
  machine: "local" | "devbox",
  display: boolean,
): Target[] =>
  machine === "local"
    ? ["local"]
    : display
      ? ["devbox", "display"]
      : ["devbox"];
