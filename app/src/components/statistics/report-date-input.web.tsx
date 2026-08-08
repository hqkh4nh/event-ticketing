import { type ChangeEvent, type CSSProperties } from "react";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTokens } from "@/hooks/use-tokens";

import type { ReportDateInputProps } from "./report-date-input.types";

export function ReportDateInput({
  label,
  value,
  onChange,
}: ReportDateInputProps) {
  const tokens = useTokens();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const style: CSSProperties = {
    width: "100%",
    height: 48,
    border: `1px solid ${tokens.outline}`,
    borderRadius: 8,
    backgroundColor: tokens["surface-container-lowest"],
    color: tokens["on-surface"],
    colorScheme,
    paddingInline: 12,
    fontSize: 14,
    fontWeight: 500,
  };

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.currentTarget.value);
  }

  return (
    <input
      aria-label={label}
      type="date"
      value={value}
      onChange={handleChange}
      style={style}
    />
  );
}
