import { TFunction } from "i18next";
import { ApiError } from "./client";

export function toUserMessage(error: unknown, t: TFunction): string {
    if (!(error instanceof ApiError)) {
        return t('api.error.NETWORK')
    }

    return t(`api.error.${error.code}`, {
        defaultValue: t('api.error.UNKNOWN'),
    })
}

export function toFieldErrors(
    error: unknown,
    t: TFunction
): Record<string, string> {
    if (!(error instanceof ApiError) || !error.fields) return {};

    return Object.fromEntries(
        error.fields.map((f) => [
            f.field,
            t(`api.validation.${f.rule}`, { defaultValue: t('api.validation.unknown') }),
        ])
    )
}