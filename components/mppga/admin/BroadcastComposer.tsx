"use client";

import { useState } from "react";

import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import { sendBroadcastAction } from "@/lib/admin/emails-actions";
import type { BroadcastAudienceCounts } from "@/lib/admin/emails-data";

interface Props {
  audience: BroadcastAudienceCounts;
}

type Audience = "active" | "all";

/**
 * Composer for one-off admin announcements. Writes through the
 * standard send helper so the resulting messages show up in the
 * Send-history table and get the shared footer treatment. The
 * `general-update` template row is reused as a carrier; its saved
 * subject and body are restored after the send completes.
 */
export function BroadcastComposer({ audience }: Props) {
  const [selected, setSelected] = useState<Audience>("active");
  const [subject, setSubject] = useState("");
  const recipientCount =
    selected === "active" ? audience.active : audience.allMembers;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const label =
      selected === "active" ? "active members" : "all members on file";
    const ok = confirm(
      `Send this announcement now?\n\n` +
        `Subject: ${subject || "(no subject)"}\n` +
        `Recipients: ${recipientCount.toLocaleString()} ${label}\n\n` +
        `This can’t be undone.`,
    );
    if (!ok) {
      event.preventDefault();
    }
  }

  return (
    <Card
      title="Send an announcement"
      description="Compose a one-off email to your members. Subject and body go through the standard footer (org name, contact, and any required disclaimers)."
    >
      <form
        action={sendBroadcastAction}
        onSubmit={handleSubmit}
        className="space-y-5 px-6 py-6"
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

        <Field label="Subject" id="broadcast-subject">
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
          label="HTML body"
          id="broadcast-body-html"
          helper="The standard footer (org name, contact info) is added automatically."
        >
          <textarea
            id="broadcast-body-html"
            name="body_html"
            rows={10}
            required
            placeholder="<p>Hi {{first_name}},</p><p>Just a quick note...</p>"
            className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 font-mono text-xs leading-relaxed text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          />
        </Field>

        <Field
          label="Plain-text body"
          id="broadcast-body-text"
          helper="A plain-text version is sent alongside the HTML for email clients that can’t display the styled version."
        >
          <textarea
            id="broadcast-body-text"
            name="body_text"
            rows={6}
            required
            placeholder={"Hi {{first_name}},\n\nJust a quick note..."}
            className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 font-mono text-xs leading-relaxed text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          />
        </Field>

        <p className="text-xs text-mppga-ink-muted">
          Variables you can use: <span className="font-mono">{`{{first_name}}`}</span>
          {" · "}
          <span className="font-mono">{`{{full_name}}`}</span>. Each member sees
          their own values.
        </p>

        <div className="flex items-center justify-between border-t border-mppga-divider pt-4">
          <p className="text-xs text-mppga-ink-soft">
            Sending to{" "}
            <span className="font-medium text-mppga-ink">
              {recipientCount.toLocaleString()}
            </span>{" "}
            {recipientCount === 1 ? "person" : "people"}.
          </p>
          <Button type="submit">Send announcement</Button>
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
        <span className="mt-2 block">{children}</span>
      </label>
    </div>
  );
}
