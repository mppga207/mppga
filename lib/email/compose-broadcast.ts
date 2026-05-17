/**
 * Composes a "broadcast" announcement email from the structured fields
 * the admin fills in (headline, body, optional CTA) into a
 * brand-styled HTML shell plus a plain-text mirror.
 *
 * Replaces the previous flow where admins typed raw HTML directly.
 * The brand shell is intentionally inline-styled — most email clients
 * strip <style> blocks, so every visual rule rides on the element.
 *
 * Variable preservation: admin copy can contain `{{first_name}}` /
 * `{{full_name}}` placeholders. `escapeHtml` only touches `<>&'"` —
 * `{` and `}` survive untouched, so the placeholders make it through
 * to the per-recipient render in `lib/email/render.ts`.
 *
 * Linkify caveat: URLs containing `&` get clipped by the regex (the
 * `&` becomes `&amp;` during HTML escape and our boundary stops there).
 * For the kinds of links admins paste into announcements (event pages,
 * registration links) this is fine; if it becomes a problem, build a
 * "Insert link" button into the composer that takes label + url
 * separately.
 */

export interface BroadcastInput {
  subject: string;
  headline: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
}

export interface ComposedBroadcast {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

const SHELL_OPEN = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;line-height:1.5;">`;
const SHELL_CLOSE = `</div>`;
const HEADLINE_OPEN = `<h1 style="font-size:24px;line-height:1.3;margin:0 0 24px;color:#2C4A4D;font-weight:600;">`;
const HEADLINE_CLOSE = `</h1>`;
const PARA_OPEN = `<p style="margin:0 0 16px;line-height:1.5;">`;
const PARA_CLOSE = `</p>`;
const LINK_STYLE = `color:#477376;text-decoration:underline;`;
const CTA_OPEN = `<p style="margin:32px 0 8px;"><a style="display:inline-block;background:#477376;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;"`;

const URL_PATTERN = /\b(https?:\/\/[^\s<>"']+)/g;

export function composeBroadcast(input: BroadcastInput): ComposedBroadcast {
  const subject = input.subject.trim();
  const headline = input.headline.trim();
  const body = input.body.replace(/\r\n/g, "\n").trim();
  const ctaText = (input.ctaText ?? "").trim();
  const ctaUrl = (input.ctaUrl ?? "").trim();
  const hasCta = Boolean(ctaText && ctaUrl);

  const headlineHtml = `${HEADLINE_OPEN}${escapeHtml(headline)}${HEADLINE_CLOSE}`;
  const bodyHtml = renderParagraphs(body);
  const ctaHtml = hasCta ? renderCta(ctaText, ctaUrl) : "";

  const fullHtml = `${SHELL_OPEN}${headlineHtml}${bodyHtml}${ctaHtml}${SHELL_CLOSE}`;
  const fullText = renderText(headline, body, hasCta ? { ctaText, ctaUrl } : null);

  return {
    subject,
    bodyHtml: fullHtml,
    bodyText: fullText,
  };
}

function renderParagraphs(body: string): string {
  if (!body) return "";
  return body
    .split(/\n{2,}/)
    .map((para) => {
      const escaped = escapeHtml(para);
      const linkified = linkify(escaped);
      const withBreaks = linkified.replace(/\n/g, "<br/>");
      return `${PARA_OPEN}${withBreaks}${PARA_CLOSE}`;
    })
    .join("");
}

function renderCta(text: string, url: string): string {
  const safeText = escapeHtml(text);
  const safeUrl = escapeAttr(url);
  return `${CTA_OPEN} href="${safeUrl}">${safeText}</a></p>`;
}

function renderText(
  headline: string,
  body: string,
  cta: { ctaText: string; ctaUrl: string } | null,
): string {
  const lines: string[] = [headline, "", body];
  if (cta) {
    lines.push("", `${cta.ctaText}: ${cta.ctaUrl}`);
  }
  return lines.join("\n");
}

function linkify(text: string): string {
  return text.replace(URL_PATTERN, (url) => {
    const safeUrl = escapeAttr(url);
    return `<a href="${safeUrl}" style="${LINK_STYLE}">${url}</a>`;
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
