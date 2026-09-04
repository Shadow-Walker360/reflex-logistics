import "@testing-library/jest-dom/vitest";

// Ensure a predictable API base URL for every test regardless of machine
// env, since src/config/env.ts throws if it's missing. Matches the
// confirmed contract base (FRONTEND_API_CONTRACT.md §1).
if (!import.meta.env.VITE_API_BASE_URL) {
  // @ts-expect-error test-only override of readonly import.meta.env
  import.meta.env.VITE_API_BASE_URL = "http://localhost:3000/api/v1";
}
