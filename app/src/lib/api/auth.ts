import { apiFetch } from "./client";

export type AuthUser = {
    id: string;
    email: string;
    fullName: string;
    role: 'ATTENDEE' | 'ORGANIZER' | 'SCANNER' | 'ADMIN';
    status: 'ACTIVE' | 'PENDING' | 'BLOCKED';
}

export type AuthResponse = { accessToken: string; user: AuthUser}

export function login(body: { email: string; password: string }): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body)
    })
}

export function register(body: {
    email: string;
    password: string;
    fullName: string;
    role?: 'ATTENDEE' | 'ORGANIZER';
}) {
    return apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body)
    })
}

export function me() {
    return apiFetch<AuthUser>('/auth/me');
}