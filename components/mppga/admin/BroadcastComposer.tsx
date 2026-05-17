"use client";

import { useRef, useState } from "react";

import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { sendBroadcastAction } from "@/lib/admin/emails-actions";
import type { BroadcastAudienceCounts } from "@/lib/admin/emails-data";

interface Props {
  audience: BroadcastAudienceCounts;
}

type Audience = "active" | "all";

interface Variable {
  token: string;
  label: string;
  description: string;
}

const VARIABLES: ReadonlyArray<Variable> = [
  {
    token: "{{first_name}}",
    label: "First name",
    description: "e.g. Hi {{first_name}},",
  },
  {
    token: "{{full_name}}",
    label: "Full name",
    description: "e.g. Dear {{full_name}},",
  },
];

/**
 * Structured composer for one-off admin announcements. The admin fills
 * in plain fields (headline, body paragraphs, optional CTA) — the
 * server builds the brand-styled HTML in `lib/email/compose-broadcast`
 * so no one has to type HTML by hand.
 *
 * The `general-update` template row still acts as the carrier: the
 * action overwrites its subject + body for the duration of the send
 * and restores after, so the standard renderer + footer treatment
 * still apply.
 */
export function BroadcastComposer({ audience }: Props) {
  const [selected, setSelected] = useState<Audience>("active");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const recipientCount =
    selected === "active" ? audience.active : audience.allMembers;

  const ctaPartial = (ctaText && !ctaUrl) || (!ctaText && ctaUrl);
  const ctaUrlValid = !ctaUrl || /^https?:\/\//i.test(ctaUrl);
  const canSubmit =
    subject.trim() &&
    headline.trim() &&
    body.trim() &&
    !ctaPartial &&
    ctaUrlValid;

  function insertVariable(token: string) {
    const ref = bodyRef.current;
    if (!ref) {
      setBody((prev) => `${prev}${token}`);
      return;
    }
    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setBody(next);
    // Restore focus + place the caret after the inserted token. Runs
    // after React commits the new value via the controlled textarea.
    queueMicrotask(() => {
      ref.focus();
      const caret = start + token.length;
      ref.setSelectionRange(caret, caret);
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const label =
      selected === "active" ? "active members" : "all members on file";
    const ctaLine =
      ctaText && ctaUrl
        ? `\nButton: ${ctaText} → ${ctaUrl}`
        : "";
    const ok = confirm(
      `Send this announcement now?\n\n` +
        `Subject: ${subject || "(no subject)"}\n` +
        `Headline: ${headline || "(no headline)"}` +
        ctaLine +
        `\nRecipients: ${recipientCount.toLocaleString()} ${label}\n\n` +
        `This can't be undone.`,
    );
    if (!ok) {
      event.preventDefault();
    }
  }

  return (
    <Card
      title="Send an announcement"
      description="Fill in the fields below — we'll wrap your message in the standard MPPGA layout (header, body, footer) automatically. No HTML required."
    >
      <form
        action={sendBroadcastAction}
        onSubmit={handleSubmit}
        className="space-y-6 px-6 py-6"
      >
        <fieldset className="space-y-3">
          <legend className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
            Audience
          </legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-mppga-divider bg-mppga-card p-4 transition-colors hover:border-mppga-teal/40 has-[:checked]:border-mppga-teal has-[:checked]:bg-mppga-teal-tint">
            <input
              type="radio"
              name="audience"
              value="active"
              checked={selected === "active"}
              onChange={() => setSelected("active")}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium text-mppga-ink">
                Active members ({audience.active.toLocaleString()})
              </span>
              <span className="block text-xs text-mppga-ink-soft">
                Everyone with a current membership, including grace period
                and honorary members.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-mppga-divider bg-mppga-card p-4 transition-colors hover:border-mppga-teal/40 has-[:checked]:border-mppga-teal has-[:checked]:bg-mppga-teal-tint">
            <input
              type="radio"
              name="audience"
              value="all"
              checked={selected === "all"}
              onChange={() => setSelected("all")}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium text-mppga-ink">
                All members on file ({audience.allMembers.toLocaleString()})
              </span>
              <span className="block text-xs text-mppga-ink-soft">
                Includes lapsed and suspended members. Use sparingly.
              </span>
            </span>
          </label>
        </fieldset>

        <Field
          label="Subject"
          id="broadcast-subject"
          helper="What members see in their inbox before they open the email."
        >
          <input
            id="broadcast-subject"
            name="subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Spring meet-up, save the date"
            className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          />
        </Field>

        <Field
          label="Headline"
          id="broadcast-headline"
          helper="The big title at the top of the email."
        >
          <input
            id="broadcast-headline"
            name="headline"
            type="text"
            required
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Save the date for our spring meet-up"
            className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          />
        </Field>

        <Field
          label="Message"
          id="broadcast-body"
          helper="Type your announcement the way you'd write any email. Separate paragraphs with a blank line. Any link you paste becomes clickable automatically."
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-mppga-ink-muted">
              Insert personalized field:
            </span>
            {VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => insertVariable(v.token)}
                title={v.description}
                className="inline-flex h-7 items-center rounded-full border border-mppga-teal/40 bg-mppga-teal-tint px-3 text-xs font-medium text-mppga-teal-deep transition-colors hover:bg-mppga-teal hover:text-white"
              >
                + {v.label}
              </button>
            ))}
          </div>
          <textarea
            ref={bodyRef}
            id="broadcast-body"
            name="body"
            rows={10}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              "Hi {{first_name}},\n\nWe're hosting a spring meet-up at the Portland shop on Saturday, June 14. Drop in for coffee, demos, and a chance to catch up with other groomers from across the state.\n\nMore details to come."
            }
            className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm leading-relaxed text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          />
        </Field>

        <Field
          label="Call-to-action button (optional)"
          id="broadcast-cta-text"
          helper="A single teal button below the message. Leave both fields blank to skip."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.5fr]">
            <input
              id="broadcast-cta-text"
              name="cta_text"
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="Button text (e.g. RSVP now)"
              className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
            />
            <input
              id="broadcast-cta-url"
              name="cta_url"
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://… (link the button opens)"
              className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
            />
          </div>
          {ctaPartial ? (
            <p className="mt-2 text-xs text-mppga-teal-deep">
              Fill in both fields, or leave both blank.
            </p>
          ) : !ctaUrlValid ? (
            <p className="mt-2 text-xs text-mppga-teal-deep">
              The link needs to start with http:// or https://.
            </p>
          ) : null}
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mppga-divider pt-5">
          <p className="text-xs text-mppga-ink-soft">
            Sending to{" "}
            <span className="font-medium text-mppga-ink">
              {recipientCount.toLocaleString()}
            </span>{" "}
            {recipientCount === 1 ? "person" : "people"}.
          </p>
          <Button type="submit" disabled={!canSubmit}>
            Send announcement
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  id,
  helper,
  children,
}: {
  label: string;
  id: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          {label}
        </span>
        {helper ? (
          <span className="mt-1 block text-xs text-mppga-ink-soft">
            {helper}
          </span>
        ) : null}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
