export const MIN_OPERATOR_BEARER_TOKEN_LENGTH = 32;

function isLoopbackHost(host: string): boolean {
  return (
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "::1" ||
    host === "[::1]"
  );
}

export function validateOperatorBearerStartupConfig(
  enableBearer: boolean,
  expectedToken?: string,
): void {
  if (!enableBearer) {
    return;
  }

  if (!expectedToken) {
    throw new Error(
      "OPERATOR_BEARER_TOKEN is required when --enable-bearer is enabled",
    );
  }

  if (expectedToken.length < MIN_OPERATOR_BEARER_TOKEN_LENGTH) {
    throw new Error(
      `OPERATOR_BEARER_TOKEN must be at least ${MIN_OPERATOR_BEARER_TOKEN_LENGTH} characters when --enable-bearer is enabled`,
    );
  }
}

export function validateOperatorHttpBindStartupConfig(
  enableBearer: boolean,
  host?: string,
): void {
  if (enableBearer || !host) {
    return;
  }

  if (!isLoopbackHost(host)) {
    throw new Error(
      "A non-loopback --host requires --enable-bearer. Bind to localhost for unauthenticated local development.",
    );
  }
}

export function validateOperatorApprovalSecret(approvalSecret?: string): void {
  if (!approvalSecret) {
    throw new Error("OPERATOR_APPROVAL_SECRET is required for apply-pending");
  }

  if (approvalSecret.length < MIN_OPERATOR_BEARER_TOKEN_LENGTH) {
    throw new Error(
      `OPERATOR_APPROVAL_SECRET must be at least ${MIN_OPERATOR_BEARER_TOKEN_LENGTH} characters`,
    );
  }
}
