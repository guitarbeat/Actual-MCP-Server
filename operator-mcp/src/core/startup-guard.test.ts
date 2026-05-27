import { describe, expect, it } from "vitest";
import {
  MIN_OPERATOR_BEARER_TOKEN_LENGTH,
  validateOperatorApprovalSecret,
  validateOperatorBearerStartupConfig,
} from "./startup-guard.js";

describe("startup-guard", () => {
  it("requires a bearer token when bearer auth is enabled", () => {
    expect(() => validateOperatorBearerStartupConfig(true, undefined)).toThrow(
      /OPERATOR_BEARER_TOKEN/,
    );
  });

  it("enforces minimum bearer token length", () => {
    expect(() => validateOperatorBearerStartupConfig(true, "short")).toThrow(
      String(MIN_OPERATOR_BEARER_TOKEN_LENGTH),
    );
  });

  it("requires a minimum approval secret length", () => {
    expect(() => validateOperatorApprovalSecret("tiny")).toThrow(
      /OPERATOR_APPROVAL_SECRET/,
    );
  });
});
