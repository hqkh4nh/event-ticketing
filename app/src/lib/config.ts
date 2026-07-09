/**
 * Runtime configuration from EXPO_PUBLIC_* env vars.
 * Expo only inlines statically-referenced `process.env.EXPO_PUBLIC_*` values.
 */
const DEFAULT_API_URL = 'http://localhost:3000';

export const config = {
  /** Backend server root. The REST client appends the `/api` prefix; Socket.IO connects to the root. */
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
};
