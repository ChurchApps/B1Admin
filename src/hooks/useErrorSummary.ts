import { useMemo } from "react";

// Flattens react-hook-form field errors into the string[] shape ErrorMessages expects.
// Pass `fields` to curate/order which errors surface (matches the hand-rolled per-field pattern,
// including synthetic keys like "root"/"_checkUrl"); omit to surface every top-level error.
export const useErrorSummary = (errors: unknown, fields?: string[]): string[] => useMemo(() => {
  if (!errors || typeof errors !== "object") return [];
  const bag = errors as Record<string, { message?: string } | undefined>;
  const source = fields ? fields.map((f) => bag[f]) : Object.values(bag);
  return source.map((e) => e?.message).filter((m): m is string => !!m);
}, [errors, fields]);
