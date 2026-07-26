import type { components } from '@/lib/api/schema';
import { apiFetch } from "./client";

export type AuthUser = components['schemas']['AuthUserDto'];
export type AuthResponse = components['schemas']['AuthResponseDto'];
export type AccountLocale = AuthUser['locale'];

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
    locale?: AccountLocale;
}) {
    return apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body)
    })
}

export function me() {
    return apiFetch<AuthUser>('/auth/me');
}

/** Pushes the device's current language up so ticket emails are written in it. */
export function updateMe(body: { locale: AccountLocale }): Promise<AuthUser> {
    return apiFetch<AuthUser>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(body)
    })
}

export function logout(): Promise<void> {
    return apiFetch<void>('/auth/logout', { method: 'POST' });
}

/** Redeems a one-time connect code for a scanner-device session. */
export function staffConnect(body: { code: string }): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/staff-connect', {
        method: 'POST',
        body: JSON.stringify(body)
    })
}
