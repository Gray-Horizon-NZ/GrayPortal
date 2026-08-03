// Vitest runs outside Next.js's webpack "react-server" export condition,
// under which the real `server-only` package always throws. Aliased in
// vitest.config.ts so DAL modules (which correctly import "server-only")
// remain testable here without weakening the real guarantee in the app.
export {};
