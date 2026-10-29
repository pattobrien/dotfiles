import type { HrTime, SpanContext } from "@opentelemetry/api";
import { hrTimeDuration } from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import {
  detectResources,
  hostDetector,
  osDetector,
  resourceFromAttributes,
  type Resource,
} from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  type ReadableSpan,
} from "@opentelemetry/sdk-trace";

import type { FinishedSpan } from "./tree.ts";

export const SCOPE = { name: "proctrace", version: "0.1.0" };

export function buildResource(hostname: string): Resource {
  return detectResources({ detectors: [hostDetector, osDetector] }).merge(
    resourceFromAttributes({
      "service.name": "proctrace",
      "service.namespace": "dotfiles",
      "service.version": SCOPE.version,
      "service.instance.id": hostname,
      "deployment.environment.name": "local",
    }),
  );
}

export function toReadableSpan(
  span: FinishedSpan,
  resource: Resource,
): ReadableSpan {
  const context: SpanContext = {
    traceId: span.traceId,
    spanId: span.spanId,
    traceFlags: 1,
  };
  return {
    name: span.name,
    kind: span.kind,
    spanContext: () => context,
    parentSpanContext: span.parent,
    startTime: span.start,
    endTime: span.end,
    status: span.status,
    attributes: span.attributes,
    links: span.links.map((link) => ({ context: link })),
    events: [],
    duration: hrTimeDuration(span.start, span.end) as HrTime,
    ended: true,
    resource,
    instrumentationScope: SCOPE,
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
  };
}

export interface SpanSink {
  emit(span: FinishedSpan): void;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

export function otlpSink(
  headers: Record<string, string>,
  resource: Resource,
): SpanSink {
  const processor = new BatchSpanProcessor({
    exporter: new OTLPTraceExporter({ headers, timeoutMillis: 15_000 }),
    maxQueueSize: 16_384,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 2_000,
    exportTimeoutMillis: 15_000,
  });
  return {
    emit: (span) => processor.onEnd(toReadableSpan(span, resource)),
    flush: () => processor.forceFlush(),
    shutdown: () => processor.shutdown(),
  };
}
