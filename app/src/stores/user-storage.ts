import { AuthUser } from "@/lib/api/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = 'auth_user';

export const userStorage = {
    async get(): Promise<AuthUser | null> {
        const raw = await AsyncStorage.getItem(USER_KEY);
        if (!raw) return null;

        try {
            return JSON.parse(raw) as AuthUser;
        } catch {
            await AsyncStorage.removeItem(USER_KEY);
            return null;
        }
    },
    async set(user: AuthUser): Promise<void> {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    async clear(): Promise<void> {
        await AsyncStorage.removeItem(USER_KEY);
    },
}