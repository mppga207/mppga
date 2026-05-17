import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { deserializeSession, serializeSession } from "./session-header";

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    email: "groomer@example.com",
    app_metadata: { role: "admin", membership_status: "Active" },
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as unknown as User;
}

describe("serializeSession + deserializeSession", () => {
  it("round-trips id, email, role, status, aud, created_at", () => {
    const encoded = serializeSession(buildUser());
    const decoded = deserializeSession(encoded);
    expect(decoded).toEqual({
      id: "11111111-2222-3333-4444-555555555555",
      email: "groomer@example.com",
      role: "admin",
      membershipStatus: "Active",
      aud: "authenticated",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("falls back to member when app_metadata.role is missing or unknown", () => {
    const encoded = serializeSession(
      buildUser({
        app_metadata: { membership_status: "Active" } as Record<string, unknown>,
      }),
    );
    expect(deserializeSession(encoded)?.role).toBe("member");
  });

  it("falls back to Awaiting_Payment for an unknown membership_status", () => {
    const encoded = serializeSession(
      buildUser({
        app_metadata: { role: "member", membership_status: "Bogus" } as Record<
          string,
          unknown
        >,
      }),
    );
    expect(deserializeSession(encoded)?.membershipStatus).toBe(
      "Awaiting_Payment",
    );
  });

  it("preserves null email when the user has none", () => {
    const encoded = serializeSession(buildUser({ email: undefined }));
    expect(deserializeSession(encoded)?.email).toBeNull();
  });
});

describe("deserializeSession rejects malformed input", () => {
  it("returns null for non-JSON", () => {
    expect(deserializeSession("not json")).toBeNull();
  });

  it("returns null when required string fields are missing", () => {
    expect(deserializeSession(JSON.stringify({ aud: "x" }))).toBeNull();
  });

  it("returns null when the payload is not an object", () => {
    expect(deserializeSession(JSON.stringify("hello"))).toBeNull();
    expect(deserializeSession(JSON.stringify(null))).toBeNull();
  });
});
