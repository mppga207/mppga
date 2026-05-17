import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  Mail,
  Sparkles,
} from "lucide-react";

import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Button } from "@/components/mppga/ui/button";
import { loadAdminOverview } from "@/lib/admin/overview-data";
import { markContactSubmissionReadAction } from "@/lib/admin/overview-actions";
import { requireAdmin } from "@/lib/supabase/session";
import type {
  ContactSubmissionItem,
  DraftEventItem,
  MemberHighlightItem,
} from "@/lib/admin/overview-data";
import type { ContactTopic } from "@/types/database";

const TOPIC_LABELS: Record<ContactTopic, string> = {
  membership: "Membership",
  events: "Events",
  sponsorship: "Sponsorship",
  press: "Press",
  other: "Something else",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function relativeFromNow(iso: string): string {
  const target = new Date(iso).getTime();
  const diffMs = Date.now() - target;
  const past = diffMs >= 0;
  const abs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (abs < minute) return past ? "just now" : "in a moment";
  if (abs < hour) {
    const n = Math.round(abs / minute);
    return past ? `${n}m ago` : `in ${n}m`;
  }
  if (abs < day) {
    const n = Math.round(abs / hour);
    return past ? `${n}h ago` : `in ${n}h`;
  }
  if (abs < week) {
    const n = Math.round(abs / day);
    return past ? `${n}d ago` : `in ${n}d`;
  }
  if (abs < 30 * day) {
    const n = Math.round(abs / week);
    return past ? `${n}w ago` : `in ${n}w`;
  }
  return dateFmt.format(target);
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const overview = await loadAdminOverview();

  const totalActionable =
    overview.contactSubmissions.total +
    overview.awaitingPayment.total +
    overview.pastDue.total +
    overview.draftEvents.total;

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Overview"
        description={
          totalActionable === 0
            ? "Nothing needs board attention right now. Check back when new contact messages, signups, or billing events arrive."
            : "Items that need board attention — new messages from the contact form, signups awaiting payment, past-due billing, and events not yet published."
        }
      />

      <Section
        icon={<Mail className="h-4 w-4" strokeWidth={1.8} />}
        title="Contact messages"
        count={overview.contactSubmissions.total}
        countLabel="unread"
        emptyMessage="No unread messages."
      >
        {overview.contactSubmissions.items.map((item) => (
          <ContactRow key={item.id} item={item} />
        ))}
        {overview.contactSubmissions.total >
        overview.contactSubmissions.items.length ? (
          <p className="px-6 py-4 text-xs text-mppga-ink-muted">
            +{" "}
            {overview.contactSubmissions.total -
              overview.contactSubmissions.items.length}{" "}
            more unread.
          </p>
        ) : null}
      </Section>

      <Section
        icon={<CreditCard className="h-4 w-4" strokeWidth={1.8} />}
        title="Signups awaiting payment"
        count={overview.awaitingPayment.total}
        countLabel="awaiting"
        emptyMessage="Everyone who's signed up has paid their dues."
        viewAllHref="/admin/members?statuses=Awaiting_Payment"
        viewAllLabel="See all"
      >
        {overview.awaitingPayment.items.map((item) => (
          <MemberRow
            key={item.profileId}
            item={item}
            meta={`Joined ${relativeFromNow(item.joinedAt ?? "")}`}
          />
        ))}
      </Section>

      <Section
        icon={<AlertCircle className="h-4 w-4" strokeWidth={1.8} />}
        title="Past-due billing"
        count={overview.pastDue.total}
        countLabel="needs attention"
        emptyMessage="No billing issues right now."
      >
        {overview.pastDue.items.map((item) => (
          <MemberRow
            key={item.profileId}
            item={item}
            meta={
              item.expiresAt
                ? `Expired ${relativeFromNow(item.expiresAt)}`
                : "Renewal overdue"
            }
          />
        ))}
      </Section>

      <Section
        icon={<CalendarClock className="h-4 w-4" strokeWidth={1.8} />}
        title="Draft events"
        count={overview.draftEvents.total}
        countLabel="not yet published"
        emptyMessage="No drafts waiting to publish."
        viewAllHref="/admin/events"
        viewAllLabel="Open Events"
      >
        {overview.draftEvents.items.map((item) => (
          <DraftEventRow key={item.id} item={item} />
        ))}
      </Section>

      <Section
        icon={<Sparkles className="h-4 w-4" strokeWidth={1.8} />}
        title="Recently joined"
        count={overview.recentlyJoined.total}
        countLabel="in the last 14 days"
        emptyMessage="No new members in the last 14 days."
      >
        {overview.recentlyJoined.items.map((item) => (
          <MemberRow
            key={item.profileId}
            item={item}
            meta={`Joined ${relativeFromNow(item.joinedAt ?? "")}`}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  countLabel,
  emptyMessage,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  countLabel: string;
  emptyMessage: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
}) {
  const hasItems = count > 0;
  return (
    <section className="overflow-hidden rounded-lg border border-mppga-divider bg-mppga-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-mppga-divider px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mppga-teal-tint text-mppga-teal">
            {icon}
          </span>
          <div>
            <h2 className="font-serif text-xl text-mppga-ink">{title}</h2>
            <p className="mt-0.5 text-xs text-mppga-ink-muted">
              <span className="font-medium text-mppga-ink-soft">{count}</span>{" "}
              {countLabel}
            </p>
          </div>
        </div>
        {viewAllHref && count > 0 ? (
          <Link
            href={viewAllHref}
            className="text-xs font-medium text-mppga-teal hover:text-mppga-teal-hover"
          >
            {viewAllLabel ?? "View all"} →
          </Link>
        ) : null}
      </header>
      {hasItems ? (
        <div className="divide-y divide-mppga-divider">{children}</div>
      ) : (
        <p className="px-6 py-10 text-center text-sm text-mppga-ink-muted">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

function ContactRow({ item }: { item: ContactSubmissionItem }) {
  return (
    <div className="space-y-3 px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="font-medium text-mppga-ink">{item.name}</p>
          <a
            href={`mailto:${item.email}`}
            className="text-sm text-mppga-teal hover:text-mppga-teal-hover"
          >
            {item.email}
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-mppga-ink-muted">
          <span className="rounded-full bg-mppga-teal-tint px-2.5 py-0.5 font-medium text-mppga-teal-deep">
            {TOPIC_LABELS[item.topic]}
          </span>
          <span>{relativeFromNow(item.createdAt)}</span>
        </div>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-mppga-ink-soft">
        {item.message}
      </p>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <form action={markContactSubmissionReadAction}>
          <input type="hidden" name="id" value={item.id} />
          <Button type="submit" variant="secondary" className="!h-8 !px-3">
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            Mark read
          </Button>
        </form>
        <a
          href={`mailto:${item.email}?subject=${encodeURIComponent(
            `Re: ${TOPIC_LABELS[item.topic]} inquiry`,
          )}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-mppga-teal hover:text-mppga-teal-hover"
        >
          Reply via email <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}

function MemberRow({
  item,
  meta,
}: {
  item: MemberHighlightItem;
  meta: string;
}) {
  return (
    <Link
      href={`/admin/members/${item.profileId}`}
      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 py-4 hover:bg-mppga-page"
    >
      <div className="min-w-0">
        <p className="font-medium text-mppga-ink">{item.fullName}</p>
        <p className="text-sm text-mppga-ink-soft">{item.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-mppga-ink-muted">
        {item.tierName ? (
          <span className="text-mppga-ink-soft">{item.tierName}</span>
        ) : null}
        <span>{meta}</span>
      </div>
    </Link>
  );
}

function DraftEventRow({ item }: { item: DraftEventItem }) {
  return (
    <Link
      href={`/admin/events/${item.id}`}
      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 py-4 hover:bg-mppga-page"
    >
      <div className="min-w-0">
        <p className="font-medium text-mppga-ink">{item.title}</p>
        <p className="text-sm text-mppga-ink-soft">{item.location}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-mppga-ink-muted">
        <span>{dateFmt.format(new Date(item.date))}</span>
      </div>
    </Link>
  );
}
