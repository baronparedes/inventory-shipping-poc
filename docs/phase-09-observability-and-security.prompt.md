---
mode: agent
description: Phase 9 — Observability, Security Hardening, and Production Readiness
---

# Phase 9: Observability & Security Hardening

## Context

The application is deployed to cloud infrastructure from Phase 8. This final phase adds production-grade observability (structured logging, error tracking, health monitoring), security hardening (rate limiting, input sanitization, security headers, audit logging), and operational tooling (graceful shutdown, alerting).

---

## 1. Structured Logging (Backend)

### Replace `morgan` with `pino`

Install: `pino`, `pino-http`, `pino-pretty` (dev only)

**`src/config/logger.ts`**

```ts
import pino from "pino";
import {env} from "./env";

export const logger = pino({
  level: env.LOG_LEVEL ?? "info",
  ...(env.NODE_ENV === "development" ? {transport: {target: "pino-pretty"}} : {}),
});
```

**`src/middleware/requestLogger.ts`**

Use `pino-http` as Express middleware. Log:

- `method`, `url`, `statusCode`, `responseTime` (ms)
- `requestId` — generate a UUID per request using `crypto.randomUUID()`
- Attach `requestId` to `req` for downstream use in service logs

Every log line in production must be structured JSON. Never log to console directly — always use `logger`.

### What to Log

| Event                                  | Level      |
| -------------------------------------- | ---------- |
| Server started                         | info       |
| Request received / completed           | info       |
| Validation error (400)                 | warn       |
| Auth failure (401/403)                 | warn       |
| Business rule violation (AppError 4xx) | warn       |
| Unhandled error (5xx)                  | error      |
| Prisma query errors                    | error      |
| DB connection success/failure          | info/error |

**Never log**: passwords, JWT tokens, full request bodies containing PII, database connection strings.

---

## 2. Error Tracking

### Sentry Integration

Install: `@sentry/node` (backend), `@sentry/react` (frontend)

**Backend (`src/config/sentry.ts`)**:

```ts
import * as Sentry from "@sentry/node";
import {env} from "./env";

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
  enabled: !!env.SENTRY_DSN,
});
```

Initialize Sentry before any other middleware. Add `Sentry.Handlers.requestHandler()` as the first middleware and `Sentry.Handlers.errorHandler()` before the global error handler.

Only capture errors with status >= 500. Log 4xx errors via `logger.warn` without sending to Sentry.

**Frontend (`src/lib/sentry.ts`)**:

```ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

Wrap the React app root in `<Sentry.ErrorBoundary fallback={<ErrorFallback />}>`.

Add `SENTRY_DSN` to `.env.example` and `VITE_SENTRY_DSN` to web `.env.example` (optional — skip if DSN not set).

---

## 3. Rate Limiting

Install: `express-rate-limit`, `rate-limit-redis` (for distributed deployments)

**`src/middleware/rateLimiter.ts`**

```ts
import rateLimit from "express-rate-limit";

// Strict limit for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many login attempts. Try again in 15 minutes.",
    },
  },
});

// General API rate limit
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
```

Apply `authRateLimiter` to `POST /api/auth/login` only.  
Apply `apiRateLimiter` to all `/api/*` routes.

For distributed deployments (multiple API instances), swap the in-memory store for `rate-limit-redis` backed by a shared Redis instance.

---

## 4. Security Headers

`helmet()` is already installed. Harden its configuration:

```ts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", env.CORS_ORIGIN],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {maxAge: 31536000, includeSubDomains: true, preload: true},
  }),
);
```

Add to nginx for the web service:

```nginx
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

---

## 5. Graceful Shutdown

**`src/index.ts`** — handle process signals:

```ts
const server = app.listen(env.PORT, () => {
  logger.info({port: env.PORT}, "Server started");
});

const shutdown = async (signal: string) => {
  logger.info({signal}, "Shutdown signal received");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Database disconnected. Process exiting.");
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

---

## 6. Health Check Enhancements

Extend `GET /api/health` to include dependency health:

```ts
GET /api/health

Response:
{
  "status": "ok" | "degraded",
  "timestamp": "ISO8601",
  "version": "1.0.0",
  "checks": {
    "database": "ok" | "error",
  }
}
```

Run `prisma.$queryRaw\`SELECT 1\`` to check DB connectivity. Return 200 if all checks pass, 503 if any check fails. Do not expose error details in the response body — log them server-side.

Used by Railway/ECS health check probes.

---

## 7. Audit Logging

For operations that change critical data, write an audit log entry alongside the mutation. Create a minimal `AuditLog` Prisma model:

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String
  action     String   // e.g. 'ORDER_CREATED', 'SHIPMENT_RECEIVED', 'REQUEST_APPROVED'
  resourceId String   // ID of the affected record
  resource   String   // Table name: 'CustomerOrder', 'ShippingOrder', etc.
  metadata   Json?    // Optional context (e.g. items count, status change)
  occurredAt DateTime @default(now())
}
```

Write audit entries (within the same Prisma transaction) for:

- `ORDER_CREATED` — when `serveCustomerOrder` completes
- `SHIPMENT_RECEIVED` — when branch confirms receipt
- `SHIPMENT_STATUS_CHANGED` — when warehouse advances dispatch status
- `REQUEST_STATUS_CHANGED` — when warehouse approves a request

Expose `GET /api/audit-logs` (WAREHOUSE only, paginated) for operational review.

---

## 8. Input Sanitization

Install: `xss` or use Zod's `.transform()` to strip/escape HTML from string fields.

Add a global sanitizer middleware that strips HTML tags from all string values in `req.body` before the Zod validation middleware runs:

```ts
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body); // recursively strip HTML from strings
  }
  next();
};
```

This prevents stored XSS if any values are ever rendered without escaping.

---

## 9. Environment Variable Security

Add these to `apps/api/src/config/env.ts` validation:

```ts
const envSchema = z.object({
  // ... existing fields ...
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  SENTRY_DSN: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(), // for rate-limit-redis
});
```

Add to `.env.example`:

```
LOG_LEVEL=info
SENTRY_DSN=
REDIS_URL=
```

---

## 10. Frontend Error Boundary

**`src/components/ErrorFallback.tsx`**

```tsx
export function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
```

Wrap each route layout (`StoreLayout`, `WarehouseLayout`) with a `<Sentry.ErrorBoundary>` so errors in one feature don't crash the whole app.

---

## 11. Dependency Security

Add to CI pipeline (`.github/workflows/ci-cd.yml`):

```yaml
audit:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v3
    - run: pnpm audit --audit-level=high
```

Fail the build if any **high** or **critical** vulnerabilities are found. Run `pnpm audit --fix` regularly to keep dependencies patched.

---

## 12. OWASP Top 10 Checklist

Verify mitigations are in place for:

| Risk                          | Mitigation                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control     | Role guards on every route; STORE users scoped to their `storeId`                                           |
| A02 Cryptographic Failures    | bcrypt for passwords; HTTPS enforced; JWT with strong secret (≥ 32 chars); no sensitive data in JWT payload |
| A03 Injection                 | Prisma parameterized queries (no raw SQL with user input); Zod input validation                             |
| A04 Insecure Design           | Atomic inventory transactions; status transition validation                                                 |
| A05 Security Misconfiguration | Helmet headers; strict CSP; env validation at startup; no default credentials                               |
| A06 Vulnerable Components     | `pnpm audit` in CI                                                                                          |
| A07 Auth Failures             | Rate limiting on login; JWT expiry; 401 on invalid tokens                                                   |
| A08 Data Integrity Failures   | Prisma transactions for multi-step operations; Zod validation on all inputs                                 |
| A09 Logging Failures          | Structured logging with pino; Sentry for 5xx; audit log for critical mutations                              |
| A10 SSRF                      | No user-controlled URLs are fetched server-side                                                             |

---

## Acceptance Criteria

- [ ] All API logs are structured JSON in production (`NODE_ENV=production`)
- [ ] Each request has a unique `requestId` in logs
- [ ] Passwords and tokens never appear in logs
- [ ] `POST /api/auth/login` is rate-limited to 10 requests per 15 minutes
- [ ] `GET /api/health` checks database connectivity and returns 503 if DB is unreachable
- [ ] Graceful shutdown completes within 10 seconds and disconnects Prisma
- [ ] `pnpm audit --audit-level=high` exits 0 (no high/critical vulnerabilities)
- [ ] Sentry captures unhandled 5xx errors (when SENTRY_DSN is configured)
- [ ] Audit log entries are written for all critical data mutations
- [ ] `GET /api/audit-logs` returns paginated entries for WAREHOUSE role
- [ ] CSP headers are present on all API and web responses
- [ ] OWASP Top 10 checklist is verified and all items have documented mitigations
