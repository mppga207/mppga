/**
 * Cookie-backed preview mode used by the temporary `/sign-in` skip-auth
 * buttons. Lets reviewers walk the member or admin dashboards without
 * a real account — needed while we're demoing the prototype before
 * Resend / a real member roster are wired up.
 *
 * The cookie is the single source of truth; middleware and the session
 * helpers honour it identically. Remove the route handler, banner CTA,
 * and this file once the launch deadline retires the preview chrome.
 */

export const PREVIEW_COOKIE = "mppga-preview";

export type PreviewMode = "member" | "admin";

export function isPreviewMode(value: unknown): value is PreviewMode {
  return value === "member" || value === "admin";
}
