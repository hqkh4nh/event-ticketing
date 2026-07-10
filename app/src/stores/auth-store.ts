import { create } from 'zustand';

import { tokenStorage } from '@/lib/auth/token-storage';

export type AuthState = {
  token: string | null;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isLoading: true,

  async hydrate() {
    try {
      const token = await tokenStorage.get();
      set({ token });
    } finally {
      set({ isLoading: false });
    }
  },

  async signIn(token) {
    await tokenStorage.set(token);
    set({ token });
  },

  async signOut() {
    await tokenStorage.clear();
    set({ token: null });
  },
}));
