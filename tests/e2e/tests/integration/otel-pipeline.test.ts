import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vite-plus/test";

const COLLECTOR = "http://127.0.0.1:4318";
const CLICKHOUSE = "http://127.0.0.1:8123";

const password = readFileSync(path.join(os.homedir(), ".config/dev-infra/.env"), "utf8").match(
  /^CLICKHOUSE_PASSWORD=(.*)$/m,
)![1]!;

async function query(sql: string): Promise<string> {
  const res = await fetch(CLICKHOUSE, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`clickhouse:${password}`).toString("base64")}`,
    },
    body: sql,
  });
  if (!res.ok) throw new Error(`clickhouse ${res.status}: ${await res.text()}`);
  return (await res.text()).trim();
}

test("collector ingests OTLP spans into ClickHouse", { timeout: 20_000 }, async () => {
  const spanName = `e2e-meta-${randomBytes(8).toString("hex")}`;
  const startNanos = Date.now() * 1e6;

  const res = await fetch(`${COLLECTOR}/v1/traces`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      resourceSpans: [
        {
          resource: {
            attributes: [{ key: "service.name", value: { stringValue: "e2e-meta" } }],
          },
          scopeSpans: [
            {
              scope: { name: "e2e-meta" },
              spans: [
                {
                  traceId: randomBytes(16).toString("hex"),
                  spanId: randomBytes(8).toString("hex"),
                  name: spanName,
                  kind: 1,
                  startTimeUnixNano: String(startNanos),
                  endTimeUnixNano: String(startNanos + 1e6),
                },
              ],
            },
          ],
        },
      ],
    }),
  });
  expect(res.status).toBe(200);

  // The collector batches for up to 5s before flushing to ClickHouse.
  await expect
    .poll(() => query(`SELECT count() FROM otel.otel_traces WHERE SpanName = '${spanName}'`), {
      timeout: 15_000,
      interval: 1_000,
    })
    .toBe("1");
});

// A run's own spans only flush after it exits, so this asserts on earlier runs.
test("vitest runs land in ClickHouse (needs a prior traced run)", async () => {
  const count = await query(
    `SELECT count() FROM otel.otel_traces
     WHERE ServiceName = 'e2e'
       AND SpanName = 'vitest.worker'
       AND Timestamp > now() - INTERVAL 1 DAY`,
  );
  expect(Number(count)).toBeGreaterThan(0);
});
