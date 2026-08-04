import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { Reporter, TestModule, Vitest } from "vitest/node";

/**
 * CTRF (https://ctrf.io) JSON reporter. Local because the published
 * vitest-ctrf-json-reporter targets the legacy reporter API that Vitest 4
 * no longer calls, so it silently produces nothing.
 */

type CtrfStatus = "passed" | "failed" | "skipped" | "pending" | "other";

interface CtrfTest {
  name: string;
  status: CtrfStatus;
  duration: number;
  filePath?: string;
  retries?: number;
  flaky?: boolean;
  message?: string;
  trace?: string;
}

interface ReporterOptions {
  outputDir?: string;
  outputFile?: string;
}

export class CtrfReporter implements Reporter {
  readonly #outputDir: string;
  readonly #outputFile: string;
  #ctx!: Vitest;
  #start = 0;

  constructor(options: ReporterOptions = {}) {
    this.#outputDir = options.outputDir ?? ".vitest/ctrf";
    this.#outputFile = options.outputFile ?? "ctrf-report.json";
  }

  onInit(ctx: Vitest): void {
    this.#ctx = ctx;
  }

  onTestRunStart(): void {
    this.#start = Date.now();
  }

  onTestRunEnd(testModules: ReadonlyArray<TestModule>): void {
    const tests: CtrfTest[] = [];
    for (const module of testModules) {
      for (const test of module.children.allTests()) {
        const result = test.result();
        const diagnostic = test.diagnostic();
        const error = result.state === "failed" ? result.errors?.[0] : undefined;
        tests.push({
          name: test.fullName,
          status: toCtrfStatus(result.state),
          duration: Math.round(diagnostic?.duration ?? 0),
          filePath: module.moduleId,
          ...(diagnostic?.retryCount ? { retries: diagnostic.retryCount } : {}),
          ...(diagnostic?.flaky ? { flaky: true } : {}),
          ...(error?.message ? { message: error.message } : {}),
          ...(error?.stack ? { trace: error.stack } : {}),
        });
      }
    }

    const count = (status: CtrfStatus) => tests.filter((t) => t.status === status).length;
    const report = {
      reportFormat: "CTRF",
      specVersion: "0.0.0",
      results: {
        tool: { name: "vitest" },
        summary: {
          tests: tests.length,
          passed: count("passed"),
          failed: count("failed"),
          pending: count("pending"),
          skipped: count("skipped"),
          other: count("other"),
          start: this.#start,
          stop: Date.now(),
        },
        tests,
      },
    };

    const dir = path.resolve(this.#ctx.config.root, this.#outputDir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, this.#outputFile), JSON.stringify(report, null, 2));
  }
}

function toCtrfStatus(state: string): CtrfStatus {
  switch (state) {
    case "passed":
    case "failed":
    case "skipped":
    case "pending":
      return state;
    default:
      return "other";
  }
}
