import type { createCli } from "trpc-cli";

export function generateZshCompletions(
  cli: ReturnType<typeof createCli>,
): string {
  const json = cli.toJSON();
  const entries = (json.commands ?? []).map((cmd) => {
    const desc = (cmd.description ?? "").replace(/'/g, "'\\''");
    return `    '${cmd.name}:${desc}'`;
  });

  return `_wt() {
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
        create)
          _arguments '1:branch:' '--base-ref[base ref to branch from]:ref:'
          ;;
      esac
      ;;
  esac
}

compdef _wt wt`;
}
