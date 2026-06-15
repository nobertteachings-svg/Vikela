export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  import("@sentry/node")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
      });
    })
    .catch(() => {
      console.warn("Sentry SDK not installed — run npm install @sentry/node -w @vikela/api");
    });
}

export function captureException(error: unknown) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  import("@sentry/node")
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {});
}
