function tryJsonStringify(value: unknown, keys?: string[]): string | undefined {
  try {
    const serialized = keys ? JSON.stringify(value, keys) : JSON.stringify(value);
    return serialized === undefined ? undefined : serialized;
  } catch {
    return undefined;
  }
}

export function serializeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name || 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error === null || error === undefined) {
    return String(error);
  }

  if (typeof error === 'object') {
    const direct = tryJsonStringify(error);
    if (direct && direct !== '{}') {
      return direct;
    }

    const ownKeys = Object.getOwnPropertyNames(error);
    const withOwnKeys = ownKeys.length > 0 ? tryJsonStringify(error, ownKeys) : undefined;
    if (withOwnKeys) {
      return withOwnKeys;
    }
  }

  return tryJsonStringify(error) ?? String(error);
}

export function normalizeUnknownError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(serializeUnknownError(error));
}
