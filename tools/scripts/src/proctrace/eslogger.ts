import type { HrTime } from "@opentelemetry/api";
import { z } from "zod";

export const EVENT_EXEC = 9;
export const EVENT_FORK = 11;
export const EVENT_EXIT = 15;

const auditToken = z.looseObject({
  pid: z.number(),
  pidversion: z.number().optional(),
  auid: z.number().optional(),
  euid: z.number().optional(),
  ruid: z.number().optional(),
  egid: z.number().optional(),
  rgid: z.number().optional(),
  asid: z.number().optional(),
});

const file = z.looseObject({
  path: z.string(),
  path_truncated: z.boolean().optional(),
});

const processSchema = z.looseObject({
  audit_token: auditToken,
  ppid: z.number(),
  original_ppid: z.number().optional(),
  group_id: z.number().optional(),
  session_id: z.number().optional(),
  executable: file,
  tty: file.nullable().optional(),
  start_time: z.unknown().optional(),
  responsible_audit_token: auditToken.optional(),
  parent_audit_token: auditToken.optional(),
  is_platform_binary: z.boolean().optional(),
  signing_id: z.string().nullable().optional(),
  team_id: z.string().nullable().optional(),
});

export const messageSchema = z.looseObject({
  schema_version: z.number().optional(),
  version: z.number().optional(),
  event_type: z.number(),
  time: z.string(),
  seq_num: z.number().optional(),
  global_seq_num: z.number().optional(),
  process: processSchema,
  event: z.looseObject({
    exec: z
      .looseObject({
        target: processSchema,
        args: z.array(z.string()).optional(),
        env: z.array(z.string()).optional(),
        cwd: file.nullable().optional(),
        script: file.nullable().optional(),
        dyld_exec_path: z.string().optional(),
      })
      .optional(),
    fork: z.looseObject({ child: processSchema }).optional(),
    exit: z.looseObject({ stat: z.number() }).optional(),
  }),
});

export type EsMessage = z.infer<typeof messageSchema>;
export type EsProcess = z.infer<typeof processSchema>;

export type ParsedLine =
  | { kind: "message"; message: EsMessage }
  | { kind: "invalid"; reason: string }
  | { kind: "other" };

export function parseLine(line: string): ParsedLine {
  if (line.length === 0) return { kind: "other" };
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch (error) {
    return { kind: "invalid", reason: String(error) };
  }
  const result = messageSchema.safeParse(raw);
  if (!result.success) {
    return { kind: "invalid", reason: z.prettifyError(result.error) };
  }
  return { kind: "message", message: result.data };
}

const timePattern =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:?\d{2})$/;

export function parseTime(value: string): HrTime {
  const match = timePattern.exec(value);
  if (!match) throw new Error(`unparseable time: ${value}`);
  const millis = Date.parse(`${match[1]}${match[3]}`);
  if (Number.isNaN(millis)) throw new Error(`unparseable time: ${value}`);
  const nanos = Number((match[2] ?? "").padEnd(9, "0"));
  return [Math.floor(millis / 1000), nanos];
}

export type ExitStatus =
  | { kind: "exited"; code: number }
  | { kind: "signaled"; signal: number; coreDumped: boolean };

export function decodeWaitStatus(stat: number): ExitStatus {
  const low = stat & 0x7f;
  if (low === 0) return { kind: "exited", code: (stat >> 8) & 0xff };
  return { kind: "signaled", signal: low, coreDumped: (stat & 0x80) !== 0 };
}
