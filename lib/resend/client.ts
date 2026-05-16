import { Resend } from "resend";

import { env } from "@/lib/env";

/**
 * Resend SDK init per `email-automation.md` §1. Lazy so a module
 * import never trips `RESEND_API_KEY` in build contexts that don't
 * need to send mail.
 */
let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  cached = new Resend(env.resend.apiKey);
  return cached;
}

export function resendFromHeader(): string {
  return `${env.resend.fromName} <${env.resend.fromEmail}>`;
}
