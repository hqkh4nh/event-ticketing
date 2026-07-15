import { create } from 'zustand';

import { AuthUser } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/auth/token-storage';
import { userStorage } from '@/stores/user-storage';

export type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  async hydrate() {
    try {
      const [token, user] = await Promise.all([
        tokenStorage.get(),
        userStorage.get(),
      ]);
      set({ token, user });
    } finally {
      set({ isLoading: false });
    }
  },

  async signIn(token, user) {
    await Promise.all([tokenStorage.set(token), userStorage.set(user)]);
    set({ token, user });
  },

  async signOut() {
    await Promise.all([tokenStorage.clear(), userStorage.clear()]);
    set({ token: null, user: null });
  },
}));
