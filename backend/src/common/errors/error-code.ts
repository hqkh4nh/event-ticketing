/**
 * Stable identifiers the client maps to localized copy. These values are part
 * of the public API contract: once a client ships against one, renaming it
 * breaks that client. Add new codes freely, never repurpose an existing one.
 */
export const ErrorCode = {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    SESSION_INVALID: 'SESSION_INVALID',
    ACCOUNT_BLOCKED: 'ACCOUNT_BLOCKED',
    ACCOUNT_PENDING_APPROVAL: 'ACCOUNT_PENDING_APPROVAL',
    FORBIDDEN_ROLE: 'FORBIDDEN_ROLE',
    NOT_EVENT_STAFF: 'NOT_EVENT_STAFF',
    EVENT_ID_REQUIRED: 'EVENT_ID_REQUIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];