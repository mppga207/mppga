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
        description="Admin-configurable schedules from email-automation.md §2. Cron functions read these values at run time — no redeploy required."
      >
        {settings ? (
          <EmailSettingsForm settings={settings} />
        ) : (
          <p className="px-6 py-6 text-sm text-mppga-ink-soft">
            Settings row missing. Run the seed migration to create it.
          </p>
        )}
      </Card>

      <Card
        title="Send history"
        description="The most recent transactional sends. Status reflects what Resend returned at send time."
      >
        <EmailSendLogTable entries={sendLog} />
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
      return "Send-timing saved. Crons pick up the new schedule on their next run.";
    default:
      return null;
  }
}
