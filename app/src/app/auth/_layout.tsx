import { useAuthStore } from "@/stores/auth-store";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
    const token = useAuthStore((s) => s.token);
    const isLoading = useAuthStore((s) => s.isLoading);

    if (isLoading) return null;

    if (token) return <Redirect href="/" />;

    return <Stack screenOptions={{ headerShown: false}} />
}