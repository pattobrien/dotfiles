import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { NodeSDK } from "@opentelemetry/sdk-node";

// Exports to the default OTLP/HTTP endpoint (http://localhost:4318/v1/traces —
// e.g. `otel-tui` or Jaeger; override with OTEL_EXPORTER_OTLP_ENDPOINT).
// Default export lets vitest flush and shut the SDK down after the run.
const sdk = new NodeSDK({
  serviceName: "e2e",
  traceExporter: new OTLPTraceExporter(),
});

sdk.start();

export default sdk;
