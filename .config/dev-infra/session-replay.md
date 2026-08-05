# Session replay (rrweb over OpenTelemetry)

Debugging-focused session replay, reusing the existing `otel-collector → ClickHouse`
pipeline and the HyperDX app as the viewer. No bespoke ingest service.

```
browser app (@hyperdx/browser, wraps @rrweb/record)
      │  OTLP/HTTP logs (each rrweb event tagged rr-web.event)
      ▼
otel-collector  ──routing/logs──▶ rr-web.event?  ── yes ─▶ clickhouse/rrweb ─▶ otel.hyperdx_sessions
                                                  └─ no ──▶ clickhouse        ─▶ otel.otel_logs
                                                                                      │
                                                              HyperDX app (viewer) ◀──┘  reads hyperdx_sessions
```

## Pieces (all in this repo)

- **Routing + sink** — `otel-collector.yaml`: a `routing/logs` connector splits logs
  carrying an `rr-web.event` attribute into a `clickhouse/rrweb` exporter that writes
  the `otel.hyperdx_sessions` table.
- **Table** — `otel.hyperdx_sessions` is auto-created by the exporter
  (`create_schema:true`, same as the `otel_logs`/`otel_traces` sinks) — no hand-maintained
  DDL. The exporter's schema omits HyperDX's `TimestampTime` column, so the viewer's
  session source must use `Timestamp` as its timestamp column (see below).

## Browser SDK (in your app)

```ts
import HyperDX from '@hyperdx/browser';

HyperDX.init({
  url: 'http://localhost:4318',      // the dev-infra otel-collector (OTLP/HTTP)
  apiKey: '',                        // unused — the local collector is unauthenticated
  service: 'my-frontend-app',
  consoleCapture: true,              // console logs/errors alongside the replay
  advancedNetworkCapture: true,      // request/response metadata
  tracePropagationTargets: [/localhost:\d+\/api/i], // correlate replay ↔ backend traces
});
```

`@hyperdx/browser` records rrweb and ships events as OTLP logs tagged `rr-web.event`
(session key `rum.sessionId` in resource attributes). Configure rrweb privacy masking
via its options; nothing is masked by default beyond the SDK's defaults.

## Viewer (seeded declaratively — no UI clicks)

HyperDX stores connections/sources in Mongo. Rather than clicking through
**Team Settings**, the `hyperdx` service seeds them from `DEFAULT_CONNECTIONS`
and `DEFAULT_SOURCES` env vars in `compose.yaml`:

- **Connection** `Default` → `http://clickhouse:8123`, user `clickhouse`
  (password interpolated from `CLICKHOUSE_PASSWORD`).
- **Sources** `Logs` (`otel.otel_logs`), `Traces` (`otel.otel_traces`), and
  `Sessions` (`otel.hyperdx_sessions`), cross-linked. The session-replay page
  **requires** the session source to reference a trace source
  (`traceSourceId`) and log source (`logSourceId`) — a lone session source
  fails validation ("Source 'Sessions' has validation issues"), so all three
  are seeded together and linked by name (HyperDX's seeder resolves names → ids).
  The session source uses timestamp column `Timestamp` (the exporter's schema
  omits HyperDX's default `TimestampTime`).

The seed only applies when Mongo has **zero** connections/sources, so it
provisions a fresh machine without ever clobbering hand-edits on a live one.
To re-seed an existing install, drop the `hyperdx` Mongo db first.

Replays then appear under **Sessions** in HyperDX (`:8082`). Correlate to your
logs/traces via the session id (`rum.sessionId` in `ResourceAttributes`).

## Reproducibility note

Fully declarative, no manual steps: `create_schema:true` creates
`otel.hyperdx_sessions` at collector startup, and the `DEFAULT_CONNECTIONS`/
`DEFAULT_SOURCES` env vars provision the HyperDX viewer on first boot.
