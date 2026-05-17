"use client";

import { useState } from "react";

import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import {
  createEmailTemplateAction,
  deleteEmailTemplateAction,
  sendTestEmailAction,
  updateEmailTemplateAction,
} from "@/lib/admin/emails-actions";
import type { AdminEmailTemplate } from "@/lib/admin/emails-data";

interface Props {
  templates: AdminEmailTemplate[];
  openKey: string | null;
}

export function EmailTemplatesPanel({ templates, openKey }: Props) {
  const initial =
    openKey && templates.some((t) => t.key === openKey)
      ? openKey
      : templates[0]?.key ?? null;
  const [selectedKey, setSelectedKey] = useState<string | null>(initial);
  const [showCreate, setShowCreate] = useState(false);

  const selected = templates.find((t) => t.key === selectedKey) ?? null;

  return (
    <Card
      title="Templates"
      description="Edit the subject and body of any email. Built-in templates can be reworded but not removed; you can add your own for one-off announcements."
    >
      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div className="space-y-1">
            {templates.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setSelectedKey(t.key);
                  setShowCreate(false);
                }}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedKey === t.key && !showCreate
                    ? "bg-mppga-teal-tint text-mppga-teal-deep"
                    : "text-mppga-ink-soft hover:bg-mppga-page"
                }`}
              >
                <p className="font-medium text-mppga-ink">{t.name}</p>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] text-mppga-ink-muted">
                  {t.isSystem ? (
                    <span className="rounded-sm bg-mppga-teal-tint px-1 text-[10px] text-mppga-teal-deep">
                      Built-in
                    </span>
                  ) : (
                    <span className="rounded-sm bg-mppga-sand px-1 text-[10px] text-mppga-ink-soft">
                      Custom
                    </span>
                  )}
                  {t.isDuesRelated ? (
                    <span className="rounded-sm bg-mppga-sand px-1 text-[10px] text-mppga-ink-soft">
                      Dues
                    </span>
                  ) : null}
                </p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className={`w-full rounded-md border border-dashed px-3 py-2 text-left text-sm transition-colors ${
              showCreate
                ? "border-mppga-teal text-mppga-teal-deep"
                : "border-mppga-divider text-mppga-ink-soft hover:border-mppga-teal/40"
            }`}
          >
            + New template
          </button>
        </div>

        <div>
          {showCreate ? (
            <CreateTemplateForm />
          ) : selected ? (
            <EditTemplateForm key={selected.key} template={selected} />
          ) : (
            <p className="text-sm text-mppga-ink-soft">
              No templates yet. Use “New template” to create one.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function EditTemplateForm({ template }: { template: AdminEmailTemplate }) {
  return (
    <form action={updateEmailTemplateAction} className="space-y-4">
      <input type="hidden" name="key" value={template.key} />

      <header>
        <h3 className="font-serif text-xl text-mppga-ink">
          {template.name}
        </h3>
        {template.availableVariables.length > 0 ? (
          <p className="mt-2 text-xs text-mppga-ink-soft">
            You can drop these into the subject or body and they’ll fill in
            per recipient:{" "}
            <span className="font-mono">
              {template.availableVariables
                .map((v) => `{{${v}}}`)
                .join(" · ")}
            </span>
          </p>
        ) : null}
      </header>

      <Field label="Display name" id={`name-${template.key}`}>
        <input
          id={`name-${template.key}`}
          name="name"
          type="text"
          required
          disabled={template.isSystem}
          defaultValue={template.name}
          className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink disabled:bg-mppga-page disabled:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>

      <Field
        label="Subject"
        id={`subject-${template.key}`}
        helper="Variables can be used here too, e.g. Welcome to MPPGA, {{full_name}}."
      >
        <input
          id={`subject-${template.key}`}
          name="subject"
          type="text"
          required
          defaultValue={template.subject}
          className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>

      <Field
        label="HTML body"
        id={`body-html-${template.key}`}
        helper="The standard footer (org name, contact, and any required disclaimers) is added automatically. Don’t include it here."
      >
        <textarea
          id={`body-html-${template.key}`}
          name="body_html"
          rows={12}
          required
          defaultValue={template.bodyHtml}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 font-mono text-xs leading-relaxed text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>

      <Field
        label="Plain-text body"
        id={`body-text-${template.key}`}
        helper="A plain-text version is sent alongside the HTML for email clients that can’t display the styled version."
      >
        <textarea
          id={`body-text-${template.key}`}
          name="body_text"
          rows={8}
          required
          defaultValue={template.bodyText}
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 font-mono text-xs leading-relaxed text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>

      <Field label="Description" id={`description-${template.key}`}>
        <input
          id={`description-${template.key}`}
          name="description"
          type="text"
          defaultValue={template.description}
          placeholder="What does this template do?"
          className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mppga-divider pt-4">
        <p className="text-xs text-mppga-ink-muted">
          Last updated{" "}
          {new Date(template.updatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SendTestForm templateKey={template.key} />
          {!template.isSystem ? <DeleteTemplateForm templateKey={template.key} /> : null}
          <Button type="submit">Save template</Button>
        </div>
      </div>
    </form>
  );
}

function SendTestForm({ templateKey }: { templateKey: string }) {
  return (
    <form
      action={sendTestEmailAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Send a test of this email to your own address using sample data?",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="key" value={templateKey} />
      <Button type="submit" variant="ghost">
        Send a test to me
      </Button>
    </form>
  );
}

function DeleteTemplateForm({ templateKey }: { templateKey: string }) {
  return (
    <form
      action={deleteEmailTemplateAction}
      onSubmit={(e) => {
        if (!confirm("Delete this template? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="key" value={templateKey} />
      <Button type="submit" variant="ghost">
        Delete
      </Button>
    </form>
  );
}

function CreateTemplateForm() {
  return (
    <form action={createEmailTemplateAction} className="space-y-4">
      <header>
        <h3 className="font-serif text-xl text-mppga-ink">New template</h3>
        <p className="mt-1 text-xs text-mppga-ink-soft">
          For one-off announcements you trigger by hand. The built-in
          automated emails (welcome, renewal reminders, etc.) are managed
          separately.
        </p>
      </header>

      <Field
        label="Identifier"
        id="new-template-key"
        helper="Lowercase letters and hyphens, used as the short name (can’t be changed later)."
      >
        <input
          id="new-template-key"
          name="key"
          type="text"
          required
          pattern="[a-z][a-z0-9-]*"
          placeholder="board-newsletter"
          className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 font-mono text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>
      <Field label="Display name" id="new-template-name">
        <input
          id="new-template-name"
          name="name"
          type="text"
          required
          placeholder="Quarterly newsletter"
          className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>
      <Field label="Subject" id="new-template-subject">
        <input
          id="new-template-subject"
          name="subject"
          type="text"
          required
          className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>
      <Field label="HTML body" id="new-template-html">
        <textarea
          id="new-template-html"
          name="body_html"
          rows={10}
          required
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 font-mono text-xs leading-relaxed text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>
      <Field label="Plain-text body" id="new-template-text">
        <textarea
          id="new-template-text"
          name="body_text"
          rows={6}
          required
          className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 font-mono text-xs leading-relaxed text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
      </Field>

      <div className="flex items-center justify-end border-t border-mppga-divider pt-4">
        <Button type="submit">Create template</Button>
      </div>
    </form>
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
