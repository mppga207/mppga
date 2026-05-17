import { Card } from "@/components/mppga/admin/Card";
import { toggleEmailTemplateEnabledAction } from "@/lib/admin/emails-actions";
import {
  AUTOMATED_EMAILS,
  type AdminEmailTemplate,
  type AutomatedEmailMeta,
} from "@/lib/admin/emails-data";

interface Props {
  templates: AdminEmailTemplate[];
}

/**
 * One row per automated email the system sends on its own (welcome,
 * renewal reminders, etc.). Each row shows the cadence and an
 * enable/disable toggle backed by `email_templates.is_enabled`. When
 * a row is off, the matching code path is short-circuited in
 * `lib/email/send.ts` — nothing reaches Resend.
 */
export function AutomatedSendsPanel({ templates }: Props) {
  const byKey = new Map(templates.map((t) => [t.key, t]));

  return (
    <Card
      title="Automated sends"
      description="The emails the system sends on its own. Turn any of them off if you’d rather handle that touchpoint by hand for a while."
    >
      <ul className="divide-y divide-mppga-divider">
        {AUTOMATED_EMAILS.map((meta) => {
          const template = byKey.get(meta.key);
          return (
            <AutomatedRow
              key={meta.key}
              meta={meta}
              template={template}
            />
          );
        })}
      </ul>
    </Card>
  );
}

function AutomatedRow({
  meta,
  template,
}: {
  meta: AutomatedEmailMeta;
  template: AdminEmailTemplate | undefined;
}) {
  const enabled = template?.isEnabled ?? false;
  const exists = Boolean(template);

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
      <div className="min-w-[18rem] flex-1">
        <p className="font-serif text-lg text-mppga-ink">{meta.label}</p>
        <p className="mt-1 text-sm text-mppga-ink-soft">{meta.summary}</p>
        <p className="mt-2 text-xs text-mppga-ink-muted">{meta.cadence}</p>
      </div>
      {exists ? (
        <form
          action={toggleEmailTemplateEnabledAction}
          className="flex items-center gap-3"
        >
          <input type="hidden" name="key" value={meta.key} />
          {/* The hidden + visible inputs let the form encode "off" too;
              checkboxes only post when checked. */}
          <span
            className={`text-xs font-medium ${
              enabled ? "text-mppga-teal-deep" : "text-mppga-ink-muted"
            }`}
          >
            {enabled ? "On" : "Off"}
          </span>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={enabled}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-6 w-11 rounded-full bg-mppga-divider transition-colors peer-checked:bg-mppga-teal"
            >
              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </span>
            <span className="sr-only">
              {enabled ? `Disable ${meta.label}` : `Enable ${meta.label}`}
            </span>
          </label>
          <button
            type="submit"
            className="rounded-md border border-mppga-teal px-3 py-1.5 text-xs font-medium text-mppga-teal transition-colors hover:bg-mppga-teal-tint"
          >
            Save
          </button>
        </form>
      ) : (
        <span className="text-xs text-mppga-ink-muted">
          Template not yet created.
        </span>
      )}
    </li>
  );
}
