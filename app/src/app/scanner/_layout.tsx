import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

/**
 * Scanner area guard. Lives on its own URL segment (`/scanner`) like the
 * organizer area, so it does not collide with the attendee group at "/". A
 * non-scanner who reaches it is sent back to the attendee root.
 */
export default function ScannerLayout() {
  const token = useAuthStore((state) => state.token);
  const isLoading = useAuthStore((state) => state.isLoading);
  const role = useAuthStore((state) => state.user?.role);

  if (isLoading) return null;
  if (!token) return <Redirect href="/auth/login" />;
  if (role !== 'SCANNER') return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
