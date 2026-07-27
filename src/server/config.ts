export type TrustProxySetting = boolean | number | string;

export function parseOptionalOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? new URL(trimmed).origin : undefined;
}

export function parseOptionalBoolean(
  value: string | undefined,
  variableName: string,
): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  throw new Error(`${variableName} must be either "true" or "false".`);
}

export function parseTrustProxy(
  value: string | undefined,
): TrustProxySetting | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}
