import { describe, it, expect } from "vitest";
import { categoryForStatus, API_ERROR_MESSAGES } from "@/api/errors";

describe("API error normalization", () => {
  it("categorizes 401 as UNAUTHENTICATED with session-expired copy, not a raw status code", () => {
    expect(categoryForStatus(401)).toBe("UNAUTHENTICATED");
    expect(API_ERROR_MESSAGES.UNAUTHENTICATED).toBe("Your session has ended. Please log in again.");
  });

  it("categorizes 403 as FORBIDDEN with permission-denied copy", () => {
    expect(categoryForStatus(403)).toBe("FORBIDDEN");
    expect(API_ERROR_MESSAGES.FORBIDDEN).toBe("You don't have permission to do that.");
  });

  it("categorizes 409 as CONFLICT with copy that signals a refresh, not a silent failure", () => {
    expect(categoryForStatus(409)).toBe("CONFLICT");
    expect(API_ERROR_MESSAGES.CONFLICT).toMatch(/updated elsewhere/i);
  });

  it("never claims success language for any 4xx/5xx category", () => {
    for (const message of Object.values(API_ERROR_MESSAGES)) {
      expect(message.toLowerCase()).not.toMatch(/success/);
    }
  });
});
