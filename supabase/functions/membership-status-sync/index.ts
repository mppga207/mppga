// Supabase Edge Function (Deno runtime).
//
// TODO(data-model.md): this function is the EXCLUSIVE owner of member status
// transitions:
//   Pending_Approval -> Awaiting_Payment -> Active -> Grace_Period -> Lapsed
//                                                  -> Suspended
//                                                  -> Honorary
// Grace period = 30 days from `expires_at`. Status transition logic must NEVER
// live in client-side code. Scaffold = stub only.

Deno.serve(() => {
  return new Response(
    JSON.stringify({ error: "membership-status-sync not yet implemented." }),
    { status: 501, headers: { "Content-Type": "application/json" } },
  );
});
