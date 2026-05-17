import {
  loadBroadcastAudienceCounts,
  loadEmailSettings,
  loadEmailTemplates,
  loadRecentEmailSends,
} from "@/lib/admin/emails-data";
import { requireAdmin } from "@/lib/supabase/session";
import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { AutomatedSendsPanel } from "@/components/mppga/admin/AutomatedSendsPanel";
import { BroadcastComposer } from "@/components/mppga/admin/BroadcastComposer";
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
  const sentParam = readParam(sp.sent);
  const failedParam = readParam(sp.failed);

  const [templates, settings, sendLog, audience] = await Promise.all([
    loadEmailTemplates(),
    loadEmailSettings(),
    loadRecentEmailSends(100),
    loadBroadcastAudienceCounts(),
  ]);

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Emails"
        description="The templates and send-timing for every message that goes to a member."
      />

      <Flash ok={ok} error={error} sent={sentParam} failed={failedParam} />

      <EmailTemplatesPanel
        templates={templates}
        openKey={openTemplate}
      />

      <AutomatedSendsPanel templates={templates} />

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

      <BroadcastComposer audience={audience} />

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
  sent,
  failed,
}: {
  ok: string | null;
  error: string | null;
  sent: string | null;
  failed: string | null;
}) {
  if (error) {
    const message = errorToMessage(error);
    return (
      <div className="rounded-md border border-mppga-sand-deep bg-mppga-sand px-4 py-3 text-sm text-mppga-ink">
        {message}
      </div>
    );
  }
  const okMessage = okToMessage(ok, sent, failed);
  if (!okMessage) return null;
  return (
    <div className="rounded-md border border-mppga-teal bg-mppga-teal-tint px-4 py-3 text-sm text-mppga-teal-deep">
      {okMessage}
    </div>
  );
}

function okToMessage(
  value: string | null,
  sent: string | null,
  failed: string | null,
): string | null {
  switch (value) {
    case "template_saved":
      return "Template updated. Next send picks up the new copy.";
    case "template_created":
      return "Template created.";
    case "template_deleted":
      return "Template deleted.";
    case "settings_saved":
      return "Send-timing saved. The new schedule takes effect on the next scheduled run.";
    case "automation_enabled":
      return "Automated email turned on.";
    case "automation_disabled":
      return "Automated email turned off. The system will skip it until you turn it back on.";
    case "test_sent":
      return "Test email sent to your inbox.";
    case "broadcast_sent": {
      const sentCount = Number(sent ?? 0);
      const failedCount = Number(failed ?? 0);
      const sentLine =
        sentCount === 1 ? "1 person" : `${sentCount.toLocaleString()} people`;
      const failPart =
        failedCount > 0
          ? ` ${failedCount.toLocaleString()} failed — check the Send history below for details.`
          : "";
      return `Announcement sent to ${sentLine}.${failPart}`;
    }
    default:
      return null;
  }
}

function errorToMessage(error: string): string {
  switch (error) {
    case "invalid_input":
      return "Something’s missing in the form. Try again.";
    case "test_failed":
      return "Couldn’t send the test email. Check the Send history below for details.";
    case "template_disabled":
      return "This email is turned off. Switch it on under Automated sends to send a test.";
    case "missing_template":
      return "Couldn’t find that template anymore — it may have been deleted.";
    case "no_admin_email":
      return "Your admin account doesn’t have an email address on file.";
    case "broadcast_missing_fields":
      return "Subject, headline, and message are all required for an announcement.";
    case "broadcast_partial_cta":
      return "Fill in both the button text and link, or leave both blank.";
    case "broadcast_invalid_url":
      return "The button link needs to start with http:// or https://.";
    case "broadcast_invalid_audience":
      return "Pick an audience before sending the announcement.";
    case "broadcast_template_missing":
      return "The announcement template is missing. Restore it before sending.";
    default:
      return `Something went wrong: ${error}.`;
  }
}
