import type { FrostRequestContext } from "@frostjs/core";

/**
 * Deduplicates an asynchronous operation within the scope of a single HTTP request.
 * Subsequent calls with the same key during the same request lifecycle will receive
 * the identical cached Promise without invoking the factory function again.
 */
export async function dedupe<T>(
  context: FrostRequestContext,
  key: string,
  factory: () => Promise<T> | T
): Promise<T> {
  const existing = context.memo.get(key);
  if (existing !== undefined) {
    return existing as T;
  }

  const promise = Promise.resolve().then(factory);
  context.memo.set(key, promise);

  try {
    const result = await promise;
    context.memo.set(key, result);
    return result;
  } catch (err) {
    // If the operation fails, remove it from memo so subsequent retries are possible
    context.memo.delete(key);
    throw err;
  }
}

