import { isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Renders only when Supabase env vars are unset — i.e. the temporary
 * sign-in preview buttons brought us here without a real session. Makes
 * it obvious to anyone clicking around the prototype that the data is
 * placeholder, not live.
 */
export function PreviewModeBanner() {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="border-b border-mppga-sand-deep bg-mppga-sand">
      <div className="mx-auto flex max-w-[1140px] items-center gap-3 px-6 py-2 text-xs text-mppga-ink-soft">
        <span className="inline-flex items-center rounded-full bg-mppga-teal-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-mppga-teal">
          Preview
        </span>
        <span>
          Placeholder data — Supabase isn&rsquo;t connected yet. Anything
          you change here won&rsquo;t save.
        </span>
      </div>
    </div>
  );
}
