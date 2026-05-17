import { describe, expect, it } from "vitest";

import { composeBroadcast } from "@/lib/email/compose-broadcast";

describe("composeBroadcast", () => {
  it("renders subject + headline", () => {
    const r = composeBroadcast({
      subject: "  Spring meet-up  ",
      headline: "Save the date",
      body: "Details coming.",
    });
    expect(r.subject).toBe("Spring meet-up");
    expect(r.bodyHtml).toContain(">Save the date<");
    expect(r.bodyText.split("\n")[0]).toBe("Save the date");
  });

  it("splits double newlines into paragraphs", () => {
    const r = composeBroadcast({
      subject: "x",
      headline: "x",
      body: "First paragraph.\n\nSecond paragraph.",
    });
    expect(r.bodyHtml.match(/<p /g)?.length).toBe(2);
    expect(r.bodyText).toContain("First paragraph.\n\nSecond paragraph.");
  });

  it("preserves single newlines inside a paragraph as <br/>", () => {
    const r = composeBroadcast({
      subject: "x",
      headline: "x",
      body: "Line one\nLine two",
    });
    expect(r.bodyHtml).toContain("Line one<br/>Line two");
  });

  it("escapes HTML in body text", () => {
    const r = composeBroadcast({
      subject: "x",
      headline: "x",
      body: "<script>alert('x')</script>",
    });
    expect(r.bodyHtml).not.toContain("<script>");
    expect(r.bodyHtml).toContain("&lt;script&gt;");
  });

  it("preserves {{first_name}} placeholders so per-recipient render works", () => {
    const r = composeBroadcast({
      subject: "x",
      headline: "Hi {{first_name}}",
      body: "Welcome, {{first_name}}.",
    });
    expect(r.bodyHtml).toContain("{{first_name}}");
    expect(r.bodyText).toContain("{{first_name}}");
  });

  it("auto-linkifies URLs in the body", () => {
    const r = composeBroadcast({
      subject: "x",
      headline: "x",
      body: "Register at https://example.com/event today.",
    });
    expect(r.bodyHtml).toContain(
      '<a href="https://example.com/event"',
    );
    expect(r.bodyHtml).toContain(">https://example.com/event</a>");
  });

  it("includes the CTA when both text and url are present", () => {
    const r = composeBroadcast({
      subject: "x",
      headline: "x",
      body: "x",
      ctaText: "Register now",
      ctaUrl: "https://example.com/register",
    });
    expect(r.bodyHtml).toContain('href="https://example.com/register"');
    expect(r.bodyHtml).toContain(">Register now</a>");
    expect(r.bodyText).toContain(
      "Register now: https://example.com/register",
    );
  });

  it("omits the CTA when either field is empty", () => {
    const onlyText = composeBroadcast({
      subject: "x",
      headline: "x",
      body: "x",
      ctaText: "Register",
      ctaUrl: "",
    });
    expect(onlyText.bodyHtml).not.toContain("background:#477376");
    const onlyUrl = composeBroadcast({
      subject: "x",
      headline: "x",
      body: "x",
      ctaText: "",
      ctaUrl: "https://example.com",
    });
    expect(onlyUrl.bodyHtml).not.toContain("background:#477376");
  });

  it("escapes HTML in the CTA text and url", () => {
    const r = composeBroadcast({
      subject: "x",
      headline: "x",
      body: "x",
      ctaText: '<b>Hi</b>',
      ctaUrl: 'https://example.com/?a="b"',
    });
    expect(r.bodyHtml).toContain("&lt;b&gt;Hi&lt;/b&gt;");
    expect(r.bodyHtml).toContain("&quot;b&quot;");
  });
});
