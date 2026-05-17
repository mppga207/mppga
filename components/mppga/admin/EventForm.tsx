import { Button } from "@/components/mppga/ui/button";
import { Card } from "@/components/mppga/admin/Card";
import type { AdminEventRow } from "@/lib/admin/data";

interface EventFormProps {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<void>;
  event?: AdminEventRow;
  errorMessage?: string | null;
}

function centsToDollars(cents: number | undefined): string {
  if (cents === undefined || cents === null) return "";
  return (cents / 100).toFixed(0);
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time.
  // We render in the server's locale; admins typically set events in
  // Eastern time and the offset is already encoded in the ISO string.
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventForm({
  mode,
  action,
  event,
  errorMessage,
}: EventFormProps) {
  return (
    <form action={action} className="space-y-8">
      {event ? (
        <input type="hidden" name="event_id" value={event.id} />
      ) : null}
      {errorMessage ? (
        <div className="rounded-md border border-mppga-sand-deep bg-mppga-sand px-4 py-3 text-sm text-mppga-ink">
          {errorMessage}
        </div>
      ) : null}

      <Card title="Basics" description="What it is, when it happens, where to find it.">
        <div className="grid grid-cols-1 gap-6 px-6 py-6">
          <FormField label="Title" htmlFor="event-title" required>
            <input
              id="event-title"
              name="title"
              type="text"
              required
              defaultValue={event?.title ?? ""}
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
              defaultValue={event?.description ?? ""}
              placeholder="A hands-on afternoon covering low-stress restraint, fear-free positioning, and how to read canine body language under the grooming arm."
              className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-3 text-sm leading-relaxed text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
            />
          </FormField>

          <FormField
            label="Location"
            htmlFor="event-location"
            required
            helper="Venue and city. For example, “Portland Yacht Club, Portland, ME”."
          >
            <input
              id="event-location"
              name="location"
              type="text"
              required
              defaultValue={event?.location ?? ""}
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
                defaultValue={toLocalInput(event?.date)}
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
                defaultValue={toLocalInput(event?.endDate)}
                className="h-11 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
              />
            </FormField>
          </div>
        </div>
      </Card>

      <Card
        title="Pricing & capacity"
        description="Member and guest prices are entered in dollars. Capacity is a hard cap. Additional registrations land on the waitlist when it’s enabled."
      >
        <div className="grid grid-cols-1 gap-6 px-6 py-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <FormField
              label="Member price"
              htmlFor="event-member-price"
              required
              helper="0 = free for members."
            >
              <DollarInput
                id="event-member-price"
                name="member_price"
                defaultValue={centsToDollars(event?.memberPriceCents)}
              />
            </FormField>
            <FormField
              label="Guest price"
              htmlFor="event-guest-price"
              required
              helper="Must be ≥ member price."
            >
              <DollarInput
                id="event-guest-price"
                name="guest_price"
                defaultValue={centsToDollars(event?.guestPriceCents)}
              />
            </FormField>
            <FormField label="Capacity" htmlFor="event-capacity" required>
              <input
                id="event-capacity"
                name="capacity"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={event?.capacity ?? ""}
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
              defaultValue={event?.lapsedMemberPricing ?? "guest"}
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
              defaultChecked={event ? event.waitlistEnabled : true}
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
              description="Keep working. Nothing is visible to members or the public yet."
              defaultChecked={(event?.status ?? "draft") === "draft"}
            />
            <StatusOption
              value="published"
              label="Publish now"
              description="Goes live on the public events page the moment you save."
              defaultChecked={event?.status === "published"}
            />
          </div>
        </fieldset>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-mppga-divider pt-6">
        <Button href="/admin/events" variant="ghost">
          Cancel
        </Button>
        <Button type="submit">
          {mode === "create" ? "Create event" : "Save changes"}
        </Button>
      </div>
    </form>
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

function DollarInput({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue?: string;
}) {
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
        defaultValue={defaultValue ?? ""}
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
