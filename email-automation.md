# MPPGA Email Automation — Sequences, Timing & Resend Integration

Read this before touching any email send, template, or automation logic.

-----

## 1. Provider

**Resend** is the confirmed email provider. All transactional sends route through Resend. Do not reference or introduce any other email provider.

Resend API key lives in env vars only. Never expose client-side. See `.env.example`.

-----

## 2. Admin-Configurable Timing

All email send timing is configurable by admin — nothing is hardcoded. Timing values are stored in the `email_settings` table (one row, singleton pattern) and read at send time.

### `email_settings` table

|Field                               |Type         |Default     |Description                                          |
|------------------------------------|-------------|------------|-----------------------------------------------------|
|`id`                                |`uuid`       |PK          |Singleton row                                        |
|`renewal_reminder_days_before`      |`integer[]`  |`[30, 7, 1]`|Days before expiry to send renewal reminders         |
|`event_reminder_hours_before`       |`integer[]`  |`[48, 2]`   |Hours before event start to send reminders           |
|`waitlist_payment_link_expiry_hours`|`integer`    |`24`        |Hours before a promoted waitlist payment link expires|
|`dunning_retry_days`                |`integer[]`  |`[3, 7, 14]`|Days after failed payment to retry dunning emails    |
|`updated_at`                        |`timestamptz`|Auto        |                                                     |

Admin edits these values in the Emails tab settings panel (to be built). Changes take effect on the next scheduled check — no redeploy required.

**Reading timing at send time:** Always query `email_settings` fresh before scheduling. Never cache timing values in application memory.

-----

## 3. Automated Sequences

### 3.1 Welcome

|Trigger  |`membership_status` transitions to `Active` for the first time|
|---------|--------------------------------------------------------------|
|Recipient|New member                                                    |
|Timing   |Immediate                                                     |
|Template |`welcome`                                                     |

-----

### 3.2 Renewal Reminders

|Trigger  |Scheduled job runs daily, checks `memberships.expires_at`                               |
|---------|----------------------------------------------------------------------------------------|
|Recipient|Active members whose `expires_at` matches a day offset in `renewal_reminder_days_before`|
|Timing   |Admin-configurable via `email_settings.renewal_reminder_days_before`                    |
|Template |`renewal-reminder`                                                                      |

Send logic: for each value N in `renewal_reminder_days_before`, query members where `expires_at = today + N days`. Send one email per matching member per interval. Do not send duplicates — check send log before firing.

-----

### 3.3 Dunning (Failed Payment)

|Trigger  |Stripe webhook: `invoice.payment_failed`                                          |
|---------|----------------------------------------------------------------------------------|
|Recipient|Member with failed charge                                                         |
|Timing   |Immediate on first failure; retry schedule per `email_settings.dunning_retry_days`|
|Template |`dunning`                                                                         |

Each dunning email includes a direct link to the Stripe Customer Portal for payment method update.

-----

### 3.4 Event Confirmation

|Trigger  |`event_registrations.payment_status` set to `paid` or `free`|
|---------|------------------------------------------------------------|
|Recipient|Registrant                                                  |
|Timing   |Immediate                                                   |
|Template |`event-confirmation`                                        |

Include: event title, date, location, amount paid (or “Free”), calendar add link (ICS).

-----

### 3.5 Waitlist Confirmation

|Trigger  |`event_registrations.status` set to `waitlisted`|
|---------|------------------------------------------------|
|Recipient|Registrant                                      |
|Timing   |Immediate                                       |
|Template |`waitlist-confirmation`                         |

Include: event title, waitlist position, explanation that they’ll be notified if a spot opens.

-----

### 3.6 Waitlist Promotion — Payment Required

|Trigger  |Waitlisted registration promoted to `confirmed`, `member_price > 0`|
|---------|-------------------------------------------------------------------|
|Recipient|Promoted registrant                                                |
|Timing   |Immediate                                                          |
|Template |`waitlist-promoted-payment`                                        |

Include: event title, Stripe Checkout link, expiry time pulled from `email_settings.waitlist_payment_link_expiry_hours`. If payment link expires without completion, registration reverts to cancelled and the next waitlisted member is promoted.

-----

### 3.7 Waitlist Promotion — Free

|Trigger  |Waitlisted registration promoted to `confirmed`, `member_price = 0`|
|---------|-------------------------------------------------------------------|
|Recipient|Promoted registrant                                                |
|Timing   |Immediate                                                          |
|Template |`event-confirmation` (reuse — no payment step)                     |

-----

### 3.8 Event Reminder

|Trigger  |Scheduled job runs hourly, checks `events.date`                    |
|---------|-------------------------------------------------------------------|
|Recipient|All confirmed registrants for the event                            |
|Timing   |Admin-configurable via `email_settings.event_reminder_hours_before`|
|Template |`event-reminder`                                                   |

For each value N in `event_reminder_hours_before`, query confirmed registrations for events where `date = now + N hours` (within a ±5 min window). Do not send duplicates — check send log.

-----

### 3.9 Event Announcement (Manual)

|Trigger  |Admin clicks “Send announcement” in the Emails tab       |
|---------|---------------------------------------------------------|
|Recipient|All active members (default); admin can scope to a subset|
|Timing   |On demand                                                |
|Template |`event-announcement` (editable body)                     |

-----

### 3.10 Registration Cancelled by Admin

|Trigger  |Admin cancels a confirmed registration|
|---------|--------------------------------------|
|Recipient|Registrant                            |
|Timing   |Immediate                             |
|Template |`registration-cancelled`              |

-----

### 3.11 General Update (Manual)

|Trigger  |Admin composes and sends from the Emails tab|
|---------|--------------------------------------------|
|Recipient|All active members (default)                |
|Timing   |On demand                                   |
|Template |`general-update` (editable subject + body)  |

-----

## 4. Send Log

Every send must be logged to a `email_send_log` table before the Resend API call. This prevents duplicate sends and provides an audit trail.

### `email_send_log` table

|Field              |Type         |Notes                                                       |
|-------------------|-------------|------------------------------------------------------------|
|`id`               |`uuid`       |PK                                                          |
|`profile_id`       |`uuid`       |FK → `profiles.id`. Null for bulk sends.                    |
|`template`         |`text`       |Template key (e.g. `renewal-reminder`)                      |
|`trigger_type`     |`text`       |e.g. `automated`, `manual`, `webhook`                       |
|`reference_id`     |`uuid`       |FK to relevant record (membership, event_registration, etc.)|
|`resend_message_id`|`text`       |Returned by Resend API on success                           |
|`status`           |`text`       |`sent`, `failed`, `bounced`                                 |
|`sent_at`          |`timestamptz`|Auto                                                        |

Before sending any automated email, query `email_send_log` for an existing row matching `profile_id + template + reference_id` within the relevant window. If found, skip.

-----

## 5. Template Registry

All templates are stored in Resend and referenced by key. Admin can edit template body copy in the Emails tab — changes sync to Resend via API. Subject lines are editable per template.

|Key                        |Name                                      |Automated |
|---------------------------|------------------------------------------|----------|
|`welcome`                  |Welcome                                   |✅         |
|`renewal-reminder`         |Renewal reminder                          |✅         |
|`dunning`                  |Payment failed                            |✅         |
|`event-confirmation`       |Event confirmation                        |✅         |
|`waitlist-confirmation`    |Waitlist confirmation                     |✅         |
|`waitlist-promoted-payment`|You’re off the waitlist — payment required|✅         |
|`event-reminder`           |Event reminder                            |✅         |
|`event-announcement`       |Event announcement                        |❌ (manual)|
|`registration-cancelled`   |Registration cancelled                    |✅         |
|`general-update`           |General update                            |❌ (manual)|

-----

## 6. Required Footer Content (All Emails)

Every email must include in the footer:

- Organization name: Maine Professional Pet Groomers Association
- Contact: `hello@mppga.org`
- Unsubscribe link (Resend-managed)
- For dues receipts only: 501(c)(6) disclaimer — “Dues paid to MPPGA are not deductible as charitable contributions for federal income tax purposes but may be deductible as ordinary business expenses.”

-----

## 7. Constraints

- NEVER hardcode timing values — always read from `email_settings`.
- NEVER send without checking `email_send_log` for duplicates first.
- NEVER expose the Resend API key client-side.
- NEVER send a dues receipt without the 501(c)(6) disclaimer.
- NEVER omit the unsubscribe link — required for CAN-SPAM compliance.
- NEVER fire email sends from client-side code — server actions, Route Handlers, or Edge Functions only.