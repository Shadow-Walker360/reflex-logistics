import { createContext } from "react";
import type { LoginCredentials, SignupRequest } from "@/services/authService";

/**
 * Split out from AuthProvider.tsx purely to satisfy the
 * react-refresh/only-export-components lint rule (AuthProvider.tsx was
 * exporting both a component AND a hook/context, which breaks React Fast
 * Refresh's ability to distinguish them — see AuthProvider.tsx and
 * useAuth.ts for the other two pieces of this split). No behavior change.
 */
export interface AuthContextValue {
  isBootstrapping: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (payload: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
