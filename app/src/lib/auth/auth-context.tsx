import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { tokenStorage } from '@/lib/auth/token-storage';

type AuthState = {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Holds the auth token, hydrated from secure storage on mount. Feature screens
 * call signIn/signOut; route guards read `token`/`isLoading`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tokenStorage
      .get()
      .then(setToken)
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      isLoading,
      async signIn(next: string) {
        await tokenStorage.set(next);
        setToken(next);
      },
      async signOut() {
        await tokenStorage.clear();
        setToken(null);
      },
    }),
    [token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
