import {
  loadEmailSettings,
  loadEmailTemplates,
  loadRecentEmailSends,
} from "@/lib/admin/emails-data";
import { requireAdmin } from "@/lib/supabase/session";
import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { EmailTemplatesPanel } from "@/components/mppga/admin/EmailTemplatesPanel";
import { EmailSettingsForm } from "@/components/mppga/admin/EmailSettingsForm";
import { EmailSendLogTable } from "@/components/mppga/admin/EmailSendLogTable";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = {
  title: "Emails · Admin · MPPGA",
};

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AdminEmailsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const ok = readParam(sp.ok);
  const error = readParam(sp.error);
  const openTemplate = readParam(sp.template);

  const [templates, settings, sendLog] = await Promise.all([
    loadEmailTemplates(),
    loadEmailSettings(),
    loadRecentEmailSends(100),
  ]);

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Emails"
        description="The templates and send-timing for every message that goes to a member."
      />

      <Flash ok={ok} error={error} />

      <EmailTemplatesPanel
        templates={templates}
        openKey={openTemplate}
      />

      <Card
        title="Send timing"
        description="When automated emails go out. Changes take effect on the next scheduled run — no waiting around."
      >
        {settings ? (
          <EmailSettingsForm settings={settings} />
        ) : (
          <p className="px-6 py-6 text-sm text-mppga-ink-soft">
            Send timing isn’t set up yet.
          </p>
        )}
      </Card>

      <Card
        title="Send history"
        description="The most recent emails sent. Status reflects whether delivery was accepted."
      >
        <EmailSendLogTable
          entries={sendLog}
          templateLabels={Object.fromEntries(
            templates.map((t) => [t.key, t.name]),
          )}
        />
      </Card>
    </div>
  );
}

function Flash({
  ok,
  error,
}: {
  ok: string | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-md border border-mppga-sand-deep bg-mppga-sand px-4 py-3 text-sm text-mppga-ink">
        Something went wrong: {error}.
      </div>
    );
  }
  const okMessage = okToMessage(ok);
  if (!okMessage) return null;
  return (
    <div className="rounded-md border border-mppga-teal bg-mppga-teal-tint px-4 py-3 text-sm text-mppga-teal-deep">
      {okMessage}
    </div>
  );
}

function okToMessage(value: string | null): string | null {
  switch (value) {
    case "template_saved":
      return "Template updated. Next send picks up the new copy.";
    case "template_created":
      return "Template created.";
    case "template_deleted":
      return "Template deleted.";
    case "settings_saved":
      return "Send-timing saved. The new schedule takes effect on the next scheduled run.";
    default:
      return null;
  }
}
