import { basename } from "node:path";

import type { Attributes, HrTime, SpanContext } from "@opentelemetry/api";
import { SpanKind, SpanStatusCode, TraceFlags } from "@opentelemetry/api";

import {
  decodeWaitStatus,
  EVENT_EXEC,
  EVENT_EXIT,
  EVENT_FORK,
  parseTime,
  type EsMessage,
  type EsProcess,
} from "./eslogger.ts";

export interface SpanIds {
  traceId: string;
  spanId: string;
}

export interface FinishedSpan {
  traceId: string;
  spanId: string;
  parent?: SpanContext;
  links: SpanContext[];
  name: string;
  kind: SpanKind;
  start: HrTime;
  end: HrTime;
  attributes: Attributes;
  status: { code: SpanStatusCode; message?: string };
}

interface OpenSpan {
  traceId: string;
  spanId: string;
  parent?: SpanContext;
  links: SpanContext[];
  name: string;
  start: HrTime;
  attributes: Attributes;
}

interface PidState {
  parentPid: number;
  traceparent?: string;
  visible: boolean;
  span?: OpenSpan;
  forkStart?: HrTime;
  forkName?: string;
}

export interface TreeSnapshot {
  pids: [number, PidState][];
}

const envExact = new Set([
  "TRACEPARENT",
  "TRACESTATE",
  "CLAUDECODE",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_PID",
  "TERM_PROGRAM",
  "TERM_PROGRAM_VERSION",
  "SHLVL",
  "ATUIN_SESSION",
  "SSH_CONNECTION",
  "TMUX",
  "KITTY_PID",
]);
const envPrefixes = ["HERDR_", "OPENCODE_", "CODEX_"];
const ARGS_BYTE_CAP = 16 * 1024;
const ENV_VALUE_CAP = 512;
const MAX_ANCESTRY = 64;
const MAX_PIDS = 250_000;
const interpreters = new Set([
  "node",
  "bun",
  "deno",
  "python",
  "python3",
  "perl",
  "ruby",
  "osascript",
]);
const shells = new Set(["zsh", "bash", "sh", "fish", "dash"]);

const traceparentPattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

export function parseTraceparent(value: string): SpanContext | undefined {
  const match = traceparentPattern.exec(value.trim());
  if (!match) return undefined;
  const traceId = match[1]!.toLowerCase();
  const spanId = match[2]!.toLowerCase();
  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) return undefined;
  const sampled = (Number.parseInt(match[3]!, 16) & 1) === 1;
  return {
    traceId,
    spanId,
    traceFlags: sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
    isRemote: true,
  };
}

function envAllowed(name: string): boolean {
  return envExact.has(name) || envPrefixes.some((p) => name.startsWith(p));
}

export function spanName(exe: string, args: string[]): string {
  const name = basename(exe);
  if (shells.has(name) && args.includes("-c")) return `${name} -c`;
  if (interpreters.has(name)) {
    const script = args.slice(1).find((a) => !a.startsWith("-"));
    if (script) return `${name} ${basename(script)}`;
  }
  return name;
}

function capArgs(args: string[]): { args: string[]; truncated: boolean } {
  let total = 0;
  const kept: string[] = [];
  for (const arg of args) {
    total += arg.length + 1;
    if (total > ARGS_BYTE_CAP) {
      const room = Math.max(0, ARGS_BYTE_CAP - (total - arg.length - 1));
      if (room > 0) kept.push(arg.slice(0, room));
      return { args: kept, truncated: true };
    }
    kept.push(arg);
  }
  return { args: kept, truncated: false };
}

function processAttributes(proc: EsProcess, prefix = ""): Attributes {
  const token = proc.audit_token;
  const attributes: Attributes = {
    [`${prefix}process.pid`]: token.pid,
    [`${prefix}process.parent_pid`]: proc.ppid,
    [`${prefix}process.executable.path`]: proc.executable.path,
    [`${prefix}process.executable.name`]: basename(proc.executable.path),
  };
  if (token.euid !== undefined)
    attributes[`${prefix}process.user.id`] = token.euid;
  if (token.ruid !== undefined)
    attributes[`${prefix}process.real_user.id`] = token.ruid;
  if (token.auid !== undefined)
    attributes[`${prefix}proctrace.audit_user.id`] = token.auid;
  if (proc.session_id !== undefined)
    attributes[`${prefix}process.session_leader.pid`] = proc.session_id;
  if (proc.group_id !== undefined)
    attributes[`${prefix}process.group_leader.pid`] = proc.group_id;
  if (proc.responsible_audit_token)
    attributes[`${prefix}proctrace.responsible_pid`] =
      proc.responsible_audit_token.pid;
  if (proc.tty?.path) attributes[`${prefix}proctrace.tty`] = proc.tty.path;
  if (proc.is_platform_binary !== undefined)
    attributes[`${prefix}proctrace.platform_binary`] = proc.is_platform_binary;
  if (proc.signing_id)
    attributes[`${prefix}proctrace.signing_id`] = proc.signing_id;
  if (proc.team_id) attributes[`${prefix}proctrace.team_id`] = proc.team_id;
  if (typeof proc.start_time === "string")
    attributes[`${prefix}process.creation.time`] = proc.start_time;
  return attributes;
}

export class ProcessTree {
  private readonly pids = new Map<number, PidState>();

  constructor(
    private readonly uid: number,
    private readonly newIds: () => SpanIds,
  ) {}

  get size(): number {
    return this.pids.size;
  }

  snapshot(): TreeSnapshot {
    return { pids: [...this.pids.entries()] };
  }

  restore(snapshot: TreeSnapshot): void {
    this.pids.clear();
    for (const [pid, state] of snapshot.pids) this.pids.set(pid, state);
  }

  handle(message: EsMessage): FinishedSpan[] {
    switch (message.event_type) {
      case EVENT_EXEC:
        return message.event.exec ? this.onExec(message) : [];
      case EVENT_FORK:
        if (message.event.fork) this.onFork(message);
        return [];
      case EVENT_EXIT:
        return message.event.exit ? this.onExit(message) : [];
      default:
        return [];
    }
  }

  private isVisible(proc: EsProcess): boolean {
    const token = proc.audit_token;
    return (
      token.auid === this.uid ||
      token.euid === this.uid ||
      token.ruid === this.uid
    );
  }

  private ancestorSpan(pid: number): OpenSpan | undefined {
    let current = this.pids.get(pid);
    for (let depth = 0; current && depth < MAX_ANCESTRY; depth++) {
      if (current.span) return current.span;
      current = this.pids.get(current.parentPid);
    }
    return undefined;
  }

  private context(span: OpenSpan): SpanContext {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      traceFlags: TraceFlags.SAMPLED,
    };
  }

  private remember(pid: number, state: PidState): void {
    if (this.pids.size >= MAX_PIDS && !this.pids.has(pid)) {
      const oldest = this.pids.keys().next().value;
      if (oldest !== undefined) this.pids.delete(oldest);
    }
    this.pids.set(pid, state);
  }

  private onFork(message: EsMessage): void {
    const child = message.event.fork!.child;
    const pid = child.audit_token.pid;
    const parentPid = message.process.audit_token.pid;
    const parent = this.pids.get(parentPid);
    this.remember(pid, {
      parentPid,
      traceparent: parent?.traceparent,
      visible: this.isVisible(child),
      forkStart: parseTime(message.time),
      forkName: basename(message.process.executable.path),
    });
  }

  private onExec(message: EsMessage): FinishedSpan[] {
    const exec = message.event.exec!;
    const target = exec.target;
    const pid = target.audit_token.pid;
    const time = parseTime(message.time);
    const finished: FinishedSpan[] = [];

    const previous = this.pids.get(pid);
    if (previous?.span) {
      previous.span.attributes["proctrace.exec_replaced"] = true;
      finished.push(
        this.finish(previous.span, time, { code: SpanStatusCode.UNSET }),
      );
    }

    const parentPid = target.ppid;
    const parentState = this.pids.get(parentPid);
    const env = exec.env ?? [];
    let traceparent: string | undefined;
    const attributes = processAttributes(target);
    for (const entry of env) {
      const eq = entry.indexOf("=");
      if (eq <= 0) continue;
      const name = entry.slice(0, eq);
      if (!envAllowed(name)) continue;
      const value = entry.slice(eq + 1);
      if (name === "TRACEPARENT") traceparent = value;
      attributes[`env.${name}`] = value.slice(0, ENV_VALUE_CAP);
    }

    const args = exec.args ?? [];
    const capped = capArgs(args);
    attributes["process.command_args"] = capped.args;
    if (capped.truncated) attributes["proctrace.args_truncated"] = true;
    if (exec.cwd?.path) attributes["process.working_directory"] = exec.cwd.path;
    if (exec.script?.path) attributes["proctrace.script"] = exec.script.path;
    if (previous?.forkStart)
      attributes["proctrace.forked_at"] = hrIso(previous.forkStart);

    const ancestor = this.ancestorSpan(parentPid);
    const injected =
      traceparent !== undefined && traceparent !== parentState?.traceparent
        ? parseTraceparent(traceparent)
        : undefined;
    let parent: SpanContext | undefined;
    const links: SpanContext[] = [];
    if (injected) {
      parent = injected;
      if (ancestor) links.push(this.context(ancestor));
    } else if (ancestor) {
      parent = this.context(ancestor);
    } else if (traceparent !== undefined) {
      parent = parseTraceparent(traceparent);
    }

    const ids = parent
      ? { traceId: parent.traceId, spanId: this.newIds().spanId }
      : this.newIds();
    const span: OpenSpan = {
      traceId: ids.traceId,
      spanId: ids.spanId,
      parent,
      links,
      name: spanName(target.executable.path, args),
      start: time,
      attributes,
    };
    this.remember(pid, {
      parentPid,
      traceparent: traceparent ?? parentState?.traceparent,
      visible: this.isVisible(target),
      span,
    });
    return finished;
  }

  private onExit(message: EsMessage): FinishedSpan[] {
    const pid = message.process.audit_token.pid;
    const state = this.pids.get(pid);
    this.pids.delete(pid);
    if (!state) return [];
    const time = parseTime(message.time);
    const exit = decodeWaitStatus(message.event.exit!.stat);

    if (state.span) {
      const span = state.span;
      if (exit.kind === "exited") {
        span.attributes["process.exit.code"] = exit.code;
      } else {
        span.attributes["proctrace.exit_signal"] = exit.signal;
        span.attributes["proctrace.core_dumped"] = exit.coreDumped;
      }
      const status =
        exit.kind === "exited" && exit.code === 0
          ? { code: SpanStatusCode.UNSET }
          : {
              code: SpanStatusCode.ERROR,
              message:
                exit.kind === "exited"
                  ? `exit ${exit.code}`
                  : `signal ${exit.signal}`,
            };
      return state.visible ? [this.finish(span, time, status)] : [];
    }

    if (state.forkStart && state.visible) {
      const ancestor = this.ancestorSpan(state.parentPid);
      const parent = ancestor
        ? this.context(ancestor)
        : state.traceparent
          ? parseTraceparent(state.traceparent)
          : undefined;
      const ids = parent
        ? { traceId: parent.traceId, spanId: this.newIds().spanId }
        : this.newIds();
      const attributes: Attributes = {
        "process.pid": pid,
        "process.parent_pid": state.parentPid,
        "proctrace.fork_only": true,
      };
      if (exit.kind === "exited") attributes["process.exit.code"] = exit.code;
      else attributes["proctrace.exit_signal"] = exit.signal;
      return [
        this.finish(
          {
            ...ids,
            parent,
            links: [],
            name: `${state.forkName ?? "fork"} (fork)`,
            start: state.forkStart,
            attributes,
          },
          time,
          exit.kind === "exited" && exit.code === 0
            ? { code: SpanStatusCode.UNSET }
            : { code: SpanStatusCode.ERROR },
        ),
      ];
    }
    return [];
  }

  private finish(
    span: OpenSpan,
    end: HrTime,
    status: FinishedSpan["status"],
  ): FinishedSpan {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parent: span.parent,
      links: span.links,
      name: span.name,
      kind: SpanKind.INTERNAL,
      start: span.start,
      end: laterOf(span.start, end),
      attributes: span.attributes,
      status,
    };
  }
}

function laterOf(a: HrTime, b: HrTime): HrTime {
  if (b[0] > a[0] || (b[0] === a[0] && b[1] >= a[1])) return b;
  return a;
}

function hrIso(time: HrTime): string {
  return `${new Date(time[0] * 1000).toISOString().slice(0, -5)}.${String(time[1]).padStart(9, "0")}Z`;
}
