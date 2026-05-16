import { AdminPageHeader } from "@/components/mppga/admin/AdminPageHeader";
import { Card } from "@/components/mppga/admin/Card";
import { SettingsTabs } from "@/components/mppga/admin/SettingsTabs";
import { Button } from "@/components/mppga/ui/button";
import { PromoteAdminPicker } from "@/components/mppga/admin/PromoteAdminPicker";
import {
  demoteAdminAction,
} from "@/lib/admin/settings-actions";
import {
  loadBoardRoster,
  searchMemberCandidates,
} from "@/lib/admin/settings-data";
import { requireAdmin } from "@/lib/supabase/session";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = {
  title: "Board roster · Admin · MPPGA",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AdminSettingsBoardPage({
  searchParams,
}: PageProps) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const ok = readParam(sp.ok);
  const error = readParam(sp.error);
  const search = readParam(sp.q) ?? "";

  const [board, candidates] = await Promise.all([
    loadBoardRoster(),
    search.length >= 2 ? searchMemberCandidates(search) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Board roster"
        description="Members with admin access. Promoting grants full read/write across the admin portal; demoting removes it on the target's next token refresh."
      />

      <SettingsTabs active="/admin/settings/board" />

      <Flash ok={ok} error={error} />

      <Card title="Current admins">
        {board.length === 0 ? (
          <p className="px-6 py-8 text-sm text-mppga-ink-soft">
            No admins on record.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-mppga-page text-left text-[11px] uppercase tracking-[0.14em] text-mppga-ink-muted">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Member since</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-mppga-divider">
              {board.map((member) => {
                const isSelf = member.profileId === session.user.id;
                return (
                  <tr key={member.profileId}>
                    <td className="px-6 py-3 font-medium text-mppga-ink">
                      {member.fullName}
                      {isSelf ? (
                        <span className="ml-2 rounded-sm bg-mppga-teal-tint px-1 text-[10px] text-mppga-teal-deep">
                          you
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-3 text-mppga-ink-soft">
                      {member.email}
                    </td>
                    <td className="px-6 py-3 text-xs text-mppga-ink-soft">
                      {dateFmt.format(new Date(member.createdAt))}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-mppga-ink-muted">
                          —
                        </span>
                      ) : (
                        <form action={demoteAdminAction}>
                          <input
                            type="hidden"
                            name="profile_id"
                            value={member.profileId}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            className="!h-auto !px-0 text-xs"
                          >
                            Demote
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card
        title="Promote a member"
        description="Search by name or email. Promotion is logged in the admin audit trail."
      >
        <PromoteAdminPicker
          searchValue={search}
          candidates={candidates}
          existingAdminIds={board.map((b) => b.profileId)}
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
    const message =
      error === "cannot_demote_self"
        ? "You can't demote yourself. Ask another admin to do it."
        : error === "last_admin"
          ? "Can't demote the last admin. Promote someone else first."
          : error === "not_admin"
            ? "That member isn't an admin."
            : `Something went wrong: ${error}.`;
    return (
      <div className="rounded-md border border-mppga-sand-deep bg-mppga-sand px-4 py-3 text-sm text-mppga-ink">
        {message}
      </div>
    );
  }
  const okMessage =
    ok === "promoted"
      ? "Member promoted to admin."
      : ok === "demoted"
        ? "Admin role revoked. They keep current-session access until their next token refresh."
        : ok === "already_admin"
          ? "Already an admin."
          : null;
  if (!okMessage) return null;
  return (
    <div className="rounded-md border border-mppga-teal bg-mppga-teal-tint px-4 py-3 text-sm text-mppga-teal-deep">
      {okMessage}
    </div>
  );
}
