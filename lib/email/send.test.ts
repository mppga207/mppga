import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks must be declared before importing the SUT.
const dedupResult = vi.fn();
const templateResult = vi.fn();
const contactResult = vi.fn();
const insertResult = vi.fn();
const resendSend = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      if (table === "email_send_log") {
        return makeSendLogQuery();
      }
      if (table === "email_templates") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => templateResult(),
            }),
          }),
        };
      }
      if (table === "site_settings") {
        return {
          select: () => ({
            limit: () => ({
              maybeSingle: async () => contactResult(),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

vi.mock("@/lib/resend/client", () => ({
  getResend: () => ({
    emails: {
      send: (...args: unknown[]) => resendSend(...args),
    },
  }),
  resendFromHeader: () => "Test <test@example.com>",
}));

import { sendTransactional } from "./send";

function makeSendLogQuery() {
  // Two consumers: the dedup read and the post-send insert. Distinguish
  // by which chain methods are called.
  let mode: "read" | "insert" = "read";
  return {
    select() {
      mode = "read";
      return {
        eq: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => dedupResult(),
              }),
            }),
          }),
        }),
      };
    },
    insert(row: unknown) {
      mode = "insert";
      return insertResult(row);
    },
    _mode: () => mode,
  };
}

beforeEach(() => {
  dedupResult.mockReset();
  templateResult.mockReset();
  contactResult.mockReset();
  insertResult.mockReset();
  resendSend.mockReset();

  templateResult.mockResolvedValue({
    data: {
      key: "welcome",
      subject: "Welcome, {{full_name}}",
      body_html: "<p>Hi {{full_name}}</p>",
      body_text: "Hi {{full_name}}",
      is_dues_related: false,
    },
    error: null,
  });
  contactResult.mockResolvedValue({
    data: { contact_email: "mppga207@gmail.com", contact_phone: null },
    error: null,
  });
  insertResult.mockResolvedValue({ error: null });
});

describe("sendTransactional", () => {
  it("skips and does not call Resend when dedup row exists", async () => {
    dedupResult.mockResolvedValue({ data: { id: "log-1" }, error: null });

    const result = await sendTransactional({
      template: "welcome",
      to: "x@example.com",
      triggerType: "webhook",
      profileId: "p1",
      referenceId: "r1",
      vars: { full_name: "Jane" },
    });

    expect(result).toEqual({ status: "skipped_duplicate" });
    expect(resendSend).not.toHaveBeenCalled();
    expect(insertResult).not.toHaveBeenCalled();
  });

  it("sends via Resend and logs success when dedup misses", async () => {
    dedupResult.mockResolvedValue({ data: null, error: null });
    resendSend.mockResolvedValue({ data: { id: "msg_123" }, error: null });

    const result = await sendTransactional({
      template: "welcome",
      to: "x@example.com",
      triggerType: "webhook",
      profileId: "p1",
      referenceId: "r1",
      vars: { full_name: "Jane" },
    });

    expect(result).toEqual({ status: "sent", messageId: "msg_123" });
    expect(resendSend).toHaveBeenCalledTimes(1);
    const firstCall = resendSend.mock.calls[0];
    if (!firstCall) throw new Error("expected a send call");
    const callArg = firstCall[0] as {
      subject: string;
      html: string;
      text: string;
    };
    expect(callArg.subject).toBe("Welcome, Jane");
    expect(callArg.html).toContain("Hi Jane");
    expect(callArg.text).toContain("Hi Jane");
    expect(insertResult).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "welcome",
        profile_id: "p1",
        reference_id: "r1",
        resend_message_id: "msg_123",
        status: "sent",
      }),
    );
  });

  it("logs failure when Resend returns an error", async () => {
    dedupResult.mockResolvedValue({ data: null, error: null });
    resendSend.mockResolvedValue({
      data: null,
      error: { message: "bounce" },
    });

    const result = await sendTransactional({
      template: "welcome",
      to: "x@example.com",
      triggerType: "webhook",
      profileId: "p1",
      referenceId: "r1",
    });

    expect(result).toEqual({ status: "failed", reason: "bounce" });
    expect(insertResult).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        resend_message_id: null,
      }),
    );
  });

  it("returns skipped_missing_template when the template key is unknown", async () => {
    dedupResult.mockResolvedValue({ data: null, error: null });
    templateResult.mockResolvedValueOnce({ data: null, error: null });

    const result = await sendTransactional({
      template: "ghost",
      to: "x@example.com",
      triggerType: "manual",
      profileId: "p1",
      referenceId: "r1",
    });

    expect(result).toEqual({ status: "skipped_missing_template" });
    expect(resendSend).not.toHaveBeenCalled();
    expect(insertResult).not.toHaveBeenCalled();
  });

  it("sends without dedup check when profile_id or reference_id is null", async () => {
    resendSend.mockResolvedValue({ data: { id: "msg_x" }, error: null });

    const result = await sendTransactional({
      template: "welcome",
      to: "x@example.com",
      triggerType: "manual",
      profileId: null,
      referenceId: null,
    });

    expect(result.status).toBe("sent");
    expect(dedupResult).not.toHaveBeenCalled();
    expect(resendSend).toHaveBeenCalledTimes(1);
  });
});
