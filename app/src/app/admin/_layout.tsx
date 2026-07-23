import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

export default function AdminLayout() {
  const token = useAuthStore((state) => state.token);
  const isLoading = useAuthStore((state) => state.isLoading);
  const role = useAuthStore((state) => state.user?.role);

  if (isLoading) return null;
  if (!token) return <Redirect href="/auth/login" />;
  if (role !== 'ADMIN') return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
