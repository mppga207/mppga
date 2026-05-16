"use client";

import { useState, type FormEvent } from "react";

import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import {
  updateTierDuesAction,
  updateTierFieldsAction,
} from "@/lib/admin/tiers-actions";
import type { AdminTier } from "@/lib/admin/tiers-data";

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(0);
}

export function TierConfigCard({ tier }: { tier: AdminTier }) {
  const [dollars, setDollars] = useState(centsToDollars(tier.annualDuesCents));
  const isBootstrap = !tier.stripePriceId;

  function handleDuesSubmit(event: FormEvent<HTMLFormElement>): void {
    const next = Number(dollars);
    if (!Number.isFinite(next) || next < 0) {
      event.preventDefault();
      alert("Enter a non-negative whole-dollar amount.");
      return;
    }
    const cents = Math.round(next * 100);
    if (cents === tier.annualDuesCents) {
      event.preventDefault();
      alert("Amount unchanged.");
      return;
    }

    const lines: string[] = [];
    if (isBootstrap) {
      lines.push(
        `Create the Stripe Product + initial Price for ${tier.name} at $${next.toFixed(0)}/year?`,
      );
      lines.push("");
      lines.push(
        "• A new Product and Price will be created in Stripe.",
      );
      lines.push("• Existing subscribers: 0 (nothing to migrate yet).");
      lines.push("• New signups will use this price immediately.");
    } else {
      const verb =
        cents > tier.annualDuesCents ? "Raise" : "Lower";
      lines.push(
        `${verb} ${tier.name} dues from $${(tier.annualDuesCents / 100).toFixed(0)} → $${next.toFixed(0)}?`,
      );
      lines.push("");
      lines.push(
        `• ${tier.activeSubscriberCount} current ${tier.name} ${tier.activeSubscriberCount === 1 ? "member" : "members"} will pay the new amount at their next renewal.`,
      );
      lines.push("• No charges happen today.");
      lines.push("• Members in grace period roll over at the same point.");
    }

    if (!confirm(lines.join("\n"))) {
      event.preventDefault();
    }
  }

  return (
    <Card>
      <div
        id={`tier-${tier.id}`}
        className="flex items-baseline justify-between border-b border-mppga-divider px-6 py-4"
      >
        <div>
          <h2 className="font-serif text-2xl text-mppga-ink">{tier.name}</h2>
          <p className="font-mono text-xs text-mppga-ink-muted">{tier.slug}</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-2xl text-mppga-teal-deep">
            ${(tier.annualDuesCents / 100).toFixed(0)}
            <span className="ml-1 text-xs text-mppga-ink-muted">/ year</span>
          </p>
          <p className="text-xs text-mppga-ink-muted">
            {tier.activeSubscriberCount}{" "}
            {tier.activeSubscriberCount === 1 ? "subscriber" : "subscribers"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
        {/* Tier metadata */}
        <form action={updateTierFieldsAction} className="space-y-4">
          <input type="hidden" name="tier_id" value={tier.id} />

          <Field label="Name" id={`name-${tier.id}`}>
            <input
              id={`name-${tier.id}`}
              name="name"
              type="text"
              required
              defaultValue={tier.name}
              className="h-10 w-full rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
            />
          </Field>

          <Field
            label="Description"
            id={`description-${tier.id}`}
            helper="Shown on the Join page."
          >
            <textarea
              id={`description-${tier.id}`}
              name="description"
              rows={3}
              defaultValue={tier.description}
              className="w-full rounded-md border border-mppga-divider bg-mppga-card px-3 py-2 text-sm leading-relaxed text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
            />
          </Field>

          <fieldset className="space-y-2 rounded-md border border-mppga-divider bg-mppga-page p-4">
            <legend className="px-2 text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Benefits
            </legend>
            <BenefitCheckbox
              id={`voting-${tier.id}`}
              name="voting_rights"
              label="Voting rights"
              defaultChecked={tier.votingRights}
            />
            <BenefitCheckbox
              id={`directory-${tier.id}`}
              name="directory_listing"
              label="Directory listing"
              defaultChecked={tier.directoryListing}
            />
            <BenefitCheckbox
              id={`corporate-${tier.id}`}
              name="corporate_umbrella"
              label="Corporate umbrella (sub-profiles)"
              defaultChecked={tier.corporateUmbrella}
            />
          </fieldset>

          <Field
            label="Display order"
            id={`order-${tier.id}`}
            helper="Lower numbers appear first."
          >
            <input
              id={`order-${tier.id}`}
              name="display_order"
              type="number"
              required
              defaultValue={tier.displayOrder}
              className="h-10 w-32 rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
            />
          </Field>

          <div className="flex items-center justify-end border-t border-mppga-divider pt-4">
            <Button type="submit">Save tier</Button>
          </div>
        </form>

        {/* Dues edit — separate form with confirmation */}
        <form
          action={updateTierDuesAction}
          onSubmit={handleDuesSubmit}
          className="space-y-4 rounded-md border border-mppga-divider bg-mppga-page p-5"
        >
          <input type="hidden" name="tier_id" value={tier.id} />
          <header>
            <h3 className="font-serif text-lg text-mppga-ink">Dues</h3>
            <p className="mt-1 text-xs text-mppga-ink-soft">
              {isBootstrap
                ? "Stripe Product not yet created for this tier. Saving here creates it and the first Price."
                : "Existing subscribers roll over to the new amount at their next renewal — no proration, no charges today."}
            </p>
          </header>

          <Field label="Annual dues" id={`dues-${tier.id}`} helper="Whole dollars.">
            <div className="flex items-center rounded-md border border-mppga-divider bg-mppga-card pl-3 focus-within:border-mppga-teal focus-within:ring-2 focus-within:ring-mppga-teal/30">
              <span className="text-sm text-mppga-ink-muted">$</span>
              <input
                id={`dues-${tier.id}`}
                name="annual_dues_dollars"
                type="number"
                min={0}
                step={1}
                required
                value={dollars}
                onChange={(e) => setDollars(e.target.value)}
                className="h-10 w-full rounded-md bg-transparent px-2 text-sm text-mppga-ink focus:outline-none"
              />
              <span className="px-3 text-xs text-mppga-ink-muted">/ year</span>
            </div>
          </Field>

          {tier.stripePriceId ? (
            <p className="font-mono text-[11px] text-mppga-ink-muted">
              price · {tier.stripePriceId}
            </p>
          ) : (
            <p className="text-xs text-mppga-ink-muted">
              Stripe Product:{" "}
              <span className="font-mono">
                {tier.stripeProductId ?? "not yet created"}
              </span>
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full">
            {isBootstrap ? "Create Stripe Price" : "Update dues"}
          </Button>
        </form>
      </div>
    </Card>
  );
}

function Field({
  label,
  id,
  helper,
  children,
}: {
  label: string;
  id: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
          {label}
        </span>
        {helper ? (
          <span className="mt-1 block text-xs text-mppga-ink-soft">
            {helper}
          </span>
        ) : null}
        <span className="mt-2 block">{children}</span>
      </label>
    </div>
  );
}

function BenefitCheckbox({
  id,
  name,
  label,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-mppga-divider text-mppga-teal focus:ring-mppga-teal/40"
      />
      <span className="text-mppga-ink">{label}</span>
    </label>
  );
}
