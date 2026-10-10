import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "vite-plus/test";

const helper = fileURLToPath(new URL("../src/claude-otel-headers.ts", import.meta.url));

const runHelper = async () => {
  const { stdout, stderr } = await promisify(execFile)(helper);
  const headers: Record<string, string> = JSON.parse(stdout);
  return { headers, stderr };
};

test("prints the Cloudflare Access service token headers from Doppler", async () => {
  const { headers, stderr } = await runHelper();

  expect(stderr).toBe("");
  expect(Object.keys(headers).toSorted()).toEqual([
    "CF-Access-Client-Id",
    "CF-Access-Client-Secret",
  ]);
  expect(Object.values(headers).map((v) => typeof v === "string" && v.length > 0)).toEqual([
    true,
    true,
  ]);
});

test("the headers admit an OTLP export through Cloudflare Access", async () => {
  const { headers } = await runHelper();

  const response = await fetch("https://otlp.finedesigns.io/v1/traces", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: "{}",
  });

  expect(response.status).toBe(200);
});
