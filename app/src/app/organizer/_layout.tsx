import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

/**
 * Organizer area guard. Lives on its own URL segment (`/organizer`) rather than
 * a route group so it does not collide with the attendee group at "/". A
 * non-organizer who reaches it is sent back to the attendee root.
 */
export default function OrganizerLayout() {
  const token = useAuthStore((state) => state.token);
  const isLoading = useAuthStore((state) => state.isLoading);
  const role = useAuthStore((state) => state.user?.role);

  if (isLoading) return null;
  if (!token) return <Redirect href="/auth/login" />;
  if (role !== 'ORGANIZER') return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
