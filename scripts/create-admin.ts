/**
 * Provision an MPPGA admin account against the current Supabase project.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SECRET_KEY=... \
 *   pnpm admin:create -- --email mppga207@gmail.com --password '...'
 *
 * Or with env-only:
 *   ADMIN_EMAIL=mppga207@gmail.com ADMIN_PASSWORD='...' pnpm admin:create
 *
 * Idempotent: if the user already exists, the script promotes their
 * profile row to `role = 'admin'` instead of erroring. Other active
 * sessions for the user are revoked so the next sign-in produces a
 * fresh JWT carrying the new claim.
 *
 * Prerequisites:
 *   1. All migrations under supabase/migrations have been applied.
 *   2. The `handle_auth_jwt_claims` hook is bound in the Supabase
 *      dashboard (Auth → Hooks → Custom Access Token). Without that,
 *      the `role` claim never reaches the JWT and middleware sends
 *      the user to /dashboard instead of /admin.
 */
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";

function required(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`Missing required value: ${name}`);
    process.exit(1);
  }
  return value;
}

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
  },
});

const url = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);
const secretKey = required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
const email = required(
  "--email or ADMIN_EMAIL",
  values.email ?? process.env.ADMIN_EMAIL,
);
const password = required(
  "--password or ADMIN_PASSWORD",
  values.password ?? process.env.ADMIN_PASSWORD,
);

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(target: string): Promise<string | null> {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser(): Promise<{ userId: string; created: boolean }> {
  const existing = await findUserByEmail(email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return { userId: existing, created: false };
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user) throw new Error("createUser returned no user");
  return { userId: data.user.id, created: true };
}

async function promoteToAdmin(userId: string): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);
  if (error) throw error;
}

async function revokeOtherSessions(userId: string): Promise<void> {
  const { error } = await admin.auth.admin.signOut(userId, "others");
  if (error && !/not found|no session/i.test(error.message)) throw error;
}

async function main(): Promise<void> {
  const { userId, created } = await ensureUser();
  await promoteToAdmin(userId);
  await revokeOtherSessions(userId);

  console.log("");
  console.log(`Admin account ${created ? "created" : "updated"}.`);
  console.log(`  email:    ${email}`);
  console.log(`  user id:  ${userId}`);
  console.log(`  role:     admin`);
  console.log("");
  console.log("Next: sign in at /sign-in. Middleware will route to /admin.");
  console.log("If you land on /dashboard instead, the JWT claims hook isn't");
  console.log("bound yet — Supabase Dashboard → Auth → Hooks → Custom Access");
  console.log("Token → select public.handle_auth_jwt_claims.");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Failed: ${message}`);
  process.exit(1);
});
