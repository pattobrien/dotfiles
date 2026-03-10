import type { AnyRouter } from "@trpc/server";
import type { createCli } from "trpc-cli";

import type { WtMeta } from "./trpc";

type CliJSON = ReturnType<ReturnType<typeof createCli>["toJSON"]>;
type CommandJSON = NonNullable<CliJSON["commands"]>[number];

function escapeZsh(s: string): string {
  return s.replace(/'/g, "'\\''");
}

interface CompletionHelper {
  fnName: string;
  shell: string;
}

function commandArgs(
  cmd: CommandJSON,
  completion: Record<string, string> | undefined,
  helpers: CompletionHelper[],
): string {
  const specs: string[] = [];

  for (let i = 0; i < (cmd.arguments ?? []).length; i++) {
    const arg = cmd.arguments![i];
    const desc = escapeZsh(arg.description ?? arg.name);
    let action = "";
    if (completion?.[arg.name]) {
      const fnName = `_wt_${cmd.name}_${arg.name}`;
      helpers.push({ fnName, shell: completion[arg.name] });
      action = fnName;
    }
    specs.push(`    '${i + 1}:${desc}:${action}'`);
  }

  for (const opt of cmd.options ?? []) {
    const desc = escapeZsh(opt.description ?? opt.name);
    const paramName = opt.attributeName || opt.name;
    let action = "";
    if (completion?.[paramName]) {
      const fnName = `_wt_${cmd.name}_${paramName}`;
      helpers.push({ fnName, shell: completion[paramName] });
      action = fnName;
    }
    specs.push(`    '--${opt.name}[${desc}]:${opt.name}:${action}'`);
  }

  if (specs.length === 0) return "";
  return `        ${cmd.name})\n          _arguments \\\n${specs.join(" \\\n")}\n          ;;`;
}

export function generateZshCompletions(
  cli: ReturnType<typeof createCli>,
  router: AnyRouter,
): string {
  const json = cli.toJSON();
  const commands = json.commands ?? [];
  const procedures = router._def.procedures as Record<
    string,
    { _def: { meta?: WtMeta } }
  >;

  const entries = commands.map((cmd) => {
    const desc = escapeZsh(cmd.description ?? "");
    return `    '${cmd.name}:${desc}'`;
  });

  const helpers: CompletionHelper[] = [];

  const cases = commands
    .map((cmd) => {
      const meta = cmd.name ? procedures[cmd.name]?._def?.meta : undefined;
      return commandArgs(cmd, meta?._completion, helpers);
    })
    .filter(Boolean)
    .join("\n");

  const helperFns = helpers
    .map((h) => `${h.fnName}() {\n  compadd $(${h.shell})\n}`)
    .join("\n\n");

  return `${helperFns}

_wt() {
  local -a commands
  commands=(
${entries.join("\n")}
  )

  _arguments -C '1:command:->command' '*::arg:->args'

  case "$state" in
    command)
      _describe 'command' commands
      ;;
    args)
      case "\${words[1]}" in
${cases}
      esac
      ;;
  esac
}

compdef _wt wt`;
}
