/**
 * Centralized environment configuration.
 *
 * This is the ONLY file that should read `import.meta.env` directly.
 * Everything else imports `env` from here. That keeps env access typed,
 * validated once at startup, and easy to grep for when a new variable
 * is added.
 *
 * No secrets belong here or in any VITE_ variable — this code ships to
 * the browser. See .env.example for the full list of variables and
 * client/README.md for what each one is for.
 */

interface ReflexEnv {
  apiBaseUrl: string;
  apiTimeoutMs: number;
  /** Empty string = realtime transport not yet configured (backend dependency). */
  realtimeUrl: string;
  /** Empty string = map provider not yet chosen (see ADR placeholder in README). */
  mapsProvider: string;
  mapsApiKey: string;
  appEnv: "development" | "staging" | "production";
}

function readEnv(): ReflexEnv {
  const raw = import.meta.env;

  const apiBaseUrl = raw.VITE_API_BASE_URL as string | undefined;
  if (!apiBaseUrl) {
    // Fail loudly at startup rather than silently calling a wrong/undefined
    // URL at request time — this is the one place we don't want a soft fallback.
    throw new Error(
      "VITE_API_BASE_URL is not set. Copy .env.example to .env.local and configure it."
    );
  }

  const appEnv = (raw.VITE_APP_ENV as string | undefined) ?? "development";

  return {
    apiBaseUrl,
    apiTimeoutMs: Number(raw.VITE_API_TIMEOUT_MS ?? 15000),
    realtimeUrl: (raw.VITE_REALTIME_URL as string | undefined) ?? "",
    mapsProvider: (raw.VITE_MAPS_PROVIDER as string | undefined) ?? "",
    mapsApiKey: (raw.VITE_MAPS_API_KEY as string | undefined) ?? "",
    appEnv: appEnv as ReflexEnv["appEnv"],
  };
}

export const env = readEnv();
