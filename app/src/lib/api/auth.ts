import type { components } from '@/lib/api/schema';
import { apiFetch } from "./client";

export type AuthUser = components['schemas']['AuthUserDto'];
export type AuthResponse = components['schemas']['AuthResponseDto'];

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

/** Redeems a one-time connect code for a scanner-device session. */
export function staffConnect(body: { code: string }): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/staff-connect', {
        method: 'POST',
        body: JSON.stringify(body)
    })
}