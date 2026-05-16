import { Button } from "@/components/mppga/ui/button";
import { resendWelcomeAction } from "@/lib/admin/actions";

export function ResendWelcomeForm({ profileId }: { profileId: string }) {
  return (
    <form action={resendWelcomeAction}>
      <input type="hidden" name="profile_id" value={profileId} />
      <Button type="submit" variant="secondary" className="w-full">
        Resend welcome email
      </Button>
    </form>
  );
}
