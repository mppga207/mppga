import { cookies } from "next/headers";

import { isSupabaseConfigured } from "@/lib/supabase/server";
import { PREVIEW_COOKIE, isPreviewMode } from "@/lib/supabase/preview";

/**
 * Renders when the visitor is in preview mode — either because Supabase
 * env vars are unset (local dev) or the `mppga-preview` cookie was set
 * by the temporary sign-in skip-auth buttons. Makes it obvious that
 * data is placeholder, and offers a one-click exit back to the
 * marketing site.
 */
export async function PreviewModeBanner() {
  const store = await cookies();
  const previewCookie = store.get(PREVIEW_COOKIE)?.value;
  const cookiePreview = isPreviewMode(previewCookie);
  const envPreview = !isSupabaseConfigured();
  if (!cookiePreview && !envPreview) return null;

  return (
    <div className="border-b border-mppga-sand-deep bg-mppga-sand">
      <div className="mx-auto flex max-w-[1140px] flex-wrap items-center gap-3 px-6 py-2 text-xs text-mppga-ink-soft">
        <span className="inline-flex items-center rounded-full bg-mppga-teal-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-mppga-teal">
          Preview
        </span>
        <span className="flex-1 min-w-[12rem]">
          Placeholder data — anything you change here won&rsquo;t save.
        </span>
        {cookiePreview ? (
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- /api route, not a page
          <a
            href="/api/preview/exit"
            className="font-medium text-mppga-teal hover:text-mppga-teal-hover"
          >
            Exit preview
          </a>
        ) : null}
      </div>
    </div>
  );
}
