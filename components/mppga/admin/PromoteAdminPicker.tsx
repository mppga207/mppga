import { Button } from "@/components/mppga/ui/button";
import { promoteToAdminAction } from "@/lib/admin/settings-actions";
import type { MemberCandidate } from "@/lib/admin/settings-data";

interface Props {
  searchValue: string;
  candidates: MemberCandidate[];
  existingAdminIds: string[];
}

export function PromoteAdminPicker({
  searchValue,
  candidates,
  existingAdminIds,
}: Props) {
  const existingSet = new Set(existingAdminIds);
  const eligible = candidates.filter((c) => !existingSet.has(c.profileId));

  return (
    <div className="space-y-5 px-6 py-6">
      <form method="get" className="flex gap-3">
        <input
          type="text"
          name="q"
          defaultValue={searchValue}
          placeholder="Search by name or email (min 2 chars)"
          className="h-10 flex-1 rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink placeholder:text-mppga-ink-muted focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {searchValue.length < 2 ? (
        <p className="text-xs text-mppga-ink-soft">
          Type at least two characters to look up a member.
        </p>
      ) : eligible.length === 0 ? (
        <p className="text-sm text-mppga-ink-soft">
          No matches for &ldquo;{searchValue}&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-mppga-divider">
          {eligible.map((candidate) => (
            <li
              key={candidate.profileId}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-mppga-ink">
                  {candidate.fullName}
                </p>
                <p className="text-xs text-mppga-ink-muted">
                  {candidate.email}
                </p>
              </div>
              <form action={promoteToAdminAction}>
                <input
                  type="hidden"
                  name="profile_id"
                  value={candidate.profileId}
                />
                <Button type="submit" variant="primary">
                  Promote
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
