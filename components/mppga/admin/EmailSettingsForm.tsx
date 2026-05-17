import { Button } from "@/components/mppga/ui/button";
import { updateEmailSettingsAction } from "@/lib/admin/emails-actions";
import type { AdminEmailSettings } from "@/lib/admin/emails-data";

export function EmailSettingsForm({
  settings,
}: {
  settings: AdminEmailSettings;
}) {
  return (
    <form action={updateEmailSettingsAction} className="space-y-5 px-6 py-6">
      <ArrayField
        label="Renewal reminders"
        helper="Days before a member’s renewal date to send a reminder. Comma- or space-separated."
        name="renewal_reminder_days_before"
        value={settings.renewalReminderDaysBefore}
        suffix="days"
      />
      <ArrayField
        label="Event reminders"
        helper="Hours before an event starts to remind confirmed attendees."
        name="event_reminder_hours_before"
        value={settings.eventReminderHoursBefore}
        suffix="hours"
      />
      <ArrayField
        label="Failed payment follow-ups"
        helper="Days after a failed payment to follow up with the member. The first email goes out immediately; this controls the follow-up cadence."
        name="dunning_retry_days"
        value={settings.dunningRetryDays}
        suffix="days"
      />
      <ScalarField
        label="Waitlist payment link expiry"
        helper="How long a waitlist payment link stays valid after a spot opens up. After this, the spot rolls to the next person on the list."
        name="waitlist_payment_link_expiry_hours"
        value={settings.waitlistPaymentLinkExpiryHours}
        suffix="hours"
      />

      <div className="flex items-center justify-between border-t border-mppga-divider pt-4">
        <p className="text-xs text-mppga-ink-muted">
          Last updated{" "}
          {new Date(settings.updatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <Button type="submit">Save timing</Button>
      </div>
    </form>
  );
}

function ArrayField({
  label,
  helper,
  name,
  value,
  suffix,
}: {
  label: string;
  helper: string;
  name: string;
  value: number[];
  suffix: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          {label}
        </span>
        <span className="mt-1 block text-xs text-mppga-ink-soft">{helper}</span>
      </label>
      <div className="mt-2 flex items-center rounded-md border border-mppga-divider bg-mppga-card pr-3 focus-within:border-mppga-teal focus-within:ring-2 focus-within:ring-mppga-teal/30">
        <input
          id={name}
          name={name}
          type="text"
          required
          defaultValue={value.join(", ")}
          placeholder="30, 7, 1"
          className="h-10 w-full rounded-md bg-transparent px-3 text-sm text-mppga-ink focus:outline-none"
        />
        <span className="text-xs text-mppga-ink-muted">{suffix}</span>
      </div>
    </div>
  );
}

function ScalarField({
  label,
  helper,
  name,
  value,
  suffix,
}: {
  label: string;
  helper: string;
  name: string;
  value: number;
  suffix: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          {label}
        </span>
        <span className="mt-1 block text-xs text-mppga-ink-soft">{helper}</span>
      </label>
      <div className="mt-2 flex items-center rounded-md border border-mppga-divider bg-mppga-card pr-3 focus-within:border-mppga-teal focus-within:ring-2 focus-within:ring-mppga-teal/30">
        <input
          id={name}
          name={name}
          type="number"
          min={1}
          step={1}
          required
          defaultValue={value}
          className="h-10 w-32 rounded-md bg-transparent px-3 text-sm text-mppga-ink focus:outline-none"
        />
        <span className="text-xs text-mppga-ink-muted">{suffix}</span>
      </div>
    </div>
  );
}
