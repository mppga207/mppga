import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";

export const metadata = {
  title: "New event · Admin · MPPGA",
};

// Field shape comes from data-model.md §3.9 / events.md §2. This is a shell:
// the form has no action and the submit buttons are disabled until a server
// action (per events.md §10 — server-side only, RLS-enforced) is wired.

export default function AdminNewEventPage() {
  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm text-mppga-ink-soft transition-colors hover:text-mppga-teal"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to events
        </Link>
      </div>

      <AdminPageHeader
        title="New event"
        description="Create a workshop, clinic, mixer, or annual meeting. Save as a draft to keep working, or publish to push it live on the public events page."
      />

      <form className="space-y-8" aria-describedby="admin-new-event-note">
        <Card title="Basics" description="What it is, when it happens, where to find it.">
          <div className="grid grid-cols-1 gap-6 px-6 py-6">
            <FormField
              label="Title"
              htmlFor="event-title"
              required
              helper="Sentence case. Shown in the public event list and on the detail page."
            >
              <input
                id="event-title"
                name="title"
                type="text"
                required
                placeholder="Safe handling workshop"
                className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="event-description"
              helper="Plain text. Line breaks are preserved on the public page."
            >
              <textarea
                id="event-description"
                name="description"
                rows={6}
                placeholder="A hands-on afternoon covering low-stress restraint, fear-free positioning, and how to read canine body language under the grooming arm."
                className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-3 text-sm leading-relaxed text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
              />
            </FormField>

            <FormField
              label="Location"
              htmlFor="event-location"
              required
              helper="Venue and city — for example, “Portland Yacht Club, Portland, ME”."
            >
              <input
                id="event-location"
                name="location"
                type="text"
                required
                placeholder="Portland, ME"
                className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
              />
            </FormField>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                label="Start"
                htmlFor="event-date"
                required
                helper="Local time."
              >
                <input
                  id="event-date"
                  name="date"
                  type="datetime-local"
                  required
                  className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
                />
              </FormField>
              <FormField
                label="End"
                htmlFor="event-end-date"
                helper="Leave empty if the end time isn’t set."
              >
                <input
                  id="event-end-date"
                  name="end_date"
                  type="datetime-local"
                  className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
                />
              </FormField>
            </div>
          </div>
        </Card>

        <Card
          title="Pricing & capacity"
          description="Member and guest prices are entered in dollars. Capacity is a hard cap — additional registrations land on the waitlist when it’s enabled."
        >
          <div className="grid grid-cols-1 gap-6 px-6 py-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <FormField
                label="Member price"
                htmlFor="event-member-price"
                required
                helper="0 = free for members."
              >
                <DollarInput id="event-member-price" name="member_price" />
              </FormField>
              <FormField
                label="Guest price"
                htmlFor="event-guest-price"
                required
                helper="Must be ≥ member price."
              >
                <DollarInput id="event-guest-price" name="guest_price" />
              </FormField>
              <FormField label="Capacity" htmlFor="event-capacity" required>
                <input
                  id="event-capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  step={1}
                  required
                  placeholder="30"
                  className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
                />
              </FormField>
            </div>

            <FormField
              label="Lapsed member pricing"
              htmlFor="event-lapsed-pricing"
              helper="What lapsed and grace-period members pay. Default: guest."
            >
              <select
                id="event-lapsed-pricing"
                name="lapsed_member_pricing"
                defaultValue="guest"
                className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
              >
                <option value="guest">Guest price</option>
                <option value="member">Member price</option>
              </select>
            </FormField>

            <div className="flex items-start gap-3 rounded-md border border-mppga-divider bg-mppga-page p-4">
              <input
                id="event-waitlist"
                name="waitlist_enabled"
                type="checkbox"
                defaultChecked
                className="mt-0.5 h-4 w-4 rounded border-mppga-divider text-mppga-teal focus:ring-mppga-teal/40"
              />
              <label htmlFor="event-waitlist" className="text-sm">
                <span className="block font-medium text-mppga-ink">
                  Enable waitlist
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-mppga-ink-soft">
                  Registrations beyond capacity land on the waitlist
                  automatically. Turn off to hard-cap at capacity.
                </span>
              </label>
            </div>
          </div>
        </Card>

        <Card
          title="Status"
          description="Drafts are admin-only. Published events appear on the public events page immediately."
        >
          <fieldset className="px-6 py-6">
            <legend className="sr-only">Status</legend>
            <div className="space-y-3">
              <StatusOption
                value="draft"
                label="Save as draft"
                description="Keep working — nothing is visible to members or the public yet."
                defaultChecked
              />
              <StatusOption
                value="published"
                label="Publish now"
                description="Goes live on the public events page the moment you save."
              />
            </div>
          </fieldset>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mppga-divider pt-6">
          <p id="admin-new-event-note" className="text-xs text-mppga-ink-muted">
            Save is being wired up to the server action. For now, the form
            validates client-side only — nothing is persisted.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/admin/events" variant="ghost">
              Cancel
            </Button>
            <Button type="submit" disabled>
              Save event
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  helper,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          {label}
          {required ? (
            <span className="ml-1 text-mppga-teal" aria-hidden>
              *
            </span>
          ) : null}
        </span>
        {helper ? (
          <span className="mt-1 block text-xs text-mppga-ink-soft">
            {helper}
          </span>
        ) : null}
        <span className="mt-2 block">{children}</span>
      </label>
    </div>
  );
}

function DollarInput({ id, name }: { id: string; name: string }) {
  return (
    <div className="flex items-center rounded-md border border-mppga-divider bg-mppga-card pl-3 shadow-sm focus-within:border-mppga-teal focus-within:ring-2 focus-within:ring-mppga-teal/30">
      <span className="text-sm text-mppga-ink-muted">$</span>
      <input
        id={id}
        name={name}
        type="number"
        min={0}
        step={1}
        required
        placeholder="0"
        className="h-11 w-full rounded-md bg-transparent px-2 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:outline-none"
      />
    </div>
  );
}

function StatusOption({
  value,
  label,
  description,
  defaultChecked,
}: {
  value: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-mppga-divider bg-mppga-page p-4 transition-colors hover:border-mppga-teal/40 has-[input:checked]:border-mppga-teal has-[input:checked]:bg-mppga-teal-tint">
      <input
        type="radio"
        name="status"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 border-mppga-divider text-mppga-teal focus:ring-mppga-teal/40"
      />
      <span>
        <span className="block text-sm font-medium text-mppga-ink">
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-mppga-ink-soft">
          {description}
        </span>
      </span>
    </label>
  );
}
