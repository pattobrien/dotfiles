#!/usr/bin/env bun

import { $ } from "bun";

const result =
  await $`doppler secrets get OTLP_ACCESS_CLIENT_ID OTLP_ACCESS_CLIENT_SECRET --json -p shed -c prod`
    .quiet()
    .nothrow();
if (result.exitCode !== 0) {
  console.error(result.stderr.toString());
  process.exit(1);
}

const secrets: unknown = JSON.parse(result.stdout.toString());

const computed = (key: string): string => {
  const entry =
    typeof secrets === "object" && secrets !== null
      ? Reflect.get(secrets, key)
      : undefined;
  const value =
    typeof entry === "object" && entry !== null
      ? Reflect.get(entry, "computed")
      : undefined;
  if (typeof value !== "string" || value === "") {
    console.error(`Doppler shed/prod ${key} is missing or empty`);
    process.exit(1);
  }
  return value;
};

console.log(
  JSON.stringify({
    "CF-Access-Client-Id": computed("OTLP_ACCESS_CLIENT_ID"),
    "CF-Access-Client-Secret": computed("OTLP_ACCESS_CLIENT_SECRET"),
  }),
);
