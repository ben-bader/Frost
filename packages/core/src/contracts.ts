/**
 * Route contracts — Standard Schema compatible validation.
 *
 * A contract is a plain object of Standard Schema validators (the same
 * `~standard` interface implemented by zod, valibot, arktype, and
 * @standard-schema/spec). Frost has no schema dependency of its own.
 *
 * ```ts
 * export const contract = {
 *   params: z.object({ id: z.string() }),
 *   search: z.object({ q: z.string().optional() }),
 *   loader: z.object({ title: z.string() }),   // validates loader return
 *   action: z.object({ name: z.string() }),    // validates action input
 * };
 * ```
 */

import { FROST_ERROR_CODES } from "./diagnostics.js";

export interface StandardSchemaIssue {
  message: string;
  path?: ReadonlyArray<PropertyKey>;
}

export interface StandardSchemaResult<Output = unknown> {
  readonly value?: Output;
  readonly issues?: ReadonlyArray<StandardSchemaIssue>;
}

export interface StandardSchemaV1<Output = unknown> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardSchemaResult<Output>;
  };
}

export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  if (typeof value !== "object" || value === null) return false;
  const standard = (value as Record<string, unknown>)["~standard"];
  if (typeof standard !== "object" || standard === null) return false;
  const s = standard as Record<string, unknown>;
  return (
    s.version === 1 &&
    typeof s.vendor === "string" &&
    typeof s.validate === "function"
  );
}

export interface RouteContract {
  /** Validates route params (dynamic segments). */
  params?: StandardSchemaV1;
  /** Validates the URL search params as a plain object. */
  search?: StandardSchemaV1;
  /** Validates the loader's return value. */
  loader?: StandardSchemaV1;
  /** Validates the action's parsed input (form fields or JSON body). */
  action?: StandardSchemaV1;
  /** Validates the record produced by the route `headers` export. */
  headers?: StandardSchemaV1;
}

export type ContractValidation =
  | { ok: true; value: unknown }
  | { ok: false; issues: ReadonlyArray<StandardSchemaIssue> };

/** Run a Standard Schema validator, normalizing thrown errors to issues. */
export function validateContractValue(
  schema: StandardSchemaV1,
  value: unknown
): ContractValidation {
  let result: StandardSchemaResult;
  try {
    result = schema["~standard"].validate(value);
  } catch (err) {
    return {
      ok: false,
      issues: [
        {
          message: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }
  if (result.issues && result.issues.length > 0) {
    return { ok: false, issues: result.issues };
  }
  return { ok: true, value: result.value ?? value };
}

/** Error thrown/reported when a contract validation fails. */
export function createContractError(
  kind: string,
  issues: ReadonlyArray<StandardSchemaIssue>
): Error & { code: string } {
  const err = new Error(
    `Contract violation (${kind}): ${formatContractIssues(issues)}`
  ) as Error & { code: string };
  err.code = FROST_ERROR_CODES.CONTRACT;
  return err;
}

/** "field.sub: message; other: message" — used in errors and overlays. */
export function formatContractIssues(
  issues: ReadonlyArray<StandardSchemaIssue>
): string {
  return issues
    .map((issue) => {
      const path = issue.path?.length ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

/** Build a plain object from URL search params (repeated keys -> arrays). */
export function searchParamsToObject(
  searchParams: URLSearchParams
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    out[key] = values.length === 1 ? values[0]! : values;
  }
  return out;
}

/** Build a plain object from FormData (files become "[File]" placeholders). */
export function formDataToObject(
  formData: FormData
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    out[key] =
      typeof value === "string" ? value : `[File: ${(value as File).name || "unnamed"}]`;
  }
  return out;
}
