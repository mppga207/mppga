"use client";

import { useState, type FormEvent } from "react";

import { Card } from "@/components/mppga/admin/Card";
import { Button } from "@/components/mppga/ui/button";
import {
  moveTierAction,
  updateTierDuesAction,
  updateTierFieldsAction,
} from "@/lib/admin/tiers-actions";
import type { AdminTier } from "@/lib/admin/tiers-data";

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(0);
}

const DEFAULT_EMPLOYEE_LIMIT = 5;

export function TierConfigCard({
  tier,
  canMoveUp,
  canMoveDown,
}: {
  tier: AdminTier;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [dollars, setDollars] = useState(centsToDollars(tier.annualDuesCents));
  const [umbrellaOn, setUmbrellaOn] = useState(tier.umbrellaAccount);
  const [employeeLimit, setEmployeeLimit] = useState(
    String(tier.umbrellaEmployeeLimit ?? DEFAULT_EMPLOYEE_LIMIT),
  );
  const [perks, setPerks] = useState<string[]>(
    tier.perks.length > 0 ? tier.perks : [""],
  );
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
        `Set up ${tier.name} pricing at $${next.toFixed(0)}/year?`,
      );
      lines.push("");
      lines.push("• No current members to roll over.");
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
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-mppga-divider px-5 py-4 sm:px-6"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex items-center overflow-hidden rounded-md border border-mppga-divider">
            <form action={moveTierAction}>
              <input type="hidden" name="tier_id" value={tier.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                disabled={!canMoveUp}
                aria-label={`Move ${tier.name} up`}
                title="Move up"
                className="flex h-8 w-8 items-center justify-center border-r border-mppga-divider text-mppga-ink-soft transition-colors hover:bg-mppga-teal-tint hover:text-mppga-teal-deep disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-mppga-ink-soft"
              >
                <span aria-hidden>↑</span>
              </button>
            </form>
            <form action={moveTierAction}>
              <input type="hidden" name="tier_id" value={tier.id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                disabled={!canMoveDown}
                aria-label={`Move ${tier.name} down`}
                title="Move down"
                className="flex h-8 w-8 items-center justify-center text-mppga-ink-soft transition-colors hover:bg-mppga-teal-tint hover:text-mppga-teal-deep disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-mppga-ink-soft"
              >
                <span aria-hidden>↓</span>
              </button>
            </form>
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-serif text-xl text-mppga-ink sm:text-2xl">
              {tier.name}
            </h2>
            <p className="truncate font-mono text-[11px] text-mppga-ink-muted">
              {tier.slug}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <span className="hidden h-8 w-px bg-mppga-divider sm:block" aria-hidden />
          <div className="text-right">
            <p className="font-serif text-xl text-mppga-teal-deep sm:text-2xl">
              ${(tier.annualDuesCents / 100).toFixed(0)}
              <span className="ml-1 text-xs text-mppga-ink-muted">/ year</span>
            </p>
            <p className="text-[11px] text-mppga-ink-muted">
              {tier.activeSubscriberCount}{" "}
              {tier.activeSubscriberCount === 1 ? "subscriber" : "subscribers"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[1fr_320px]">
        {/* Tier metadata */}
        <form action={updateTierFieldsAction} className="space-y-5">
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

          <fieldset className="space-y-3 rounded-md border border-mppga-divider bg-mppga-page p-4">
            <legend className="px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
              Feature flags
            </legend>
            <BenefitRow
              id={`directory-${tier.id}`}
              name="directory_listing"
              label="Public directory listing"
              defaultChecked={tier.directoryListing}
            />
            <SalonCoverageRow
              tierId={tier.id}
              checked={umbrellaOn}
              onCheckedChange={setUmbrellaOn}
              employeeLimit={employeeLimit}
              onEmployeeLimitChange={setEmployeeLimit}
            />
          </fieldset>

          <PerksEditor tierId={tier.id} perks={perks} onChange={setPerks} />

          <div className="flex items-center justify-end border-t border-mppga-divider pt-4">
            <Button type="submit">Save tier</Button>
          </div>
        </form>

        {/* Dues edit: separate form with confirmation */}
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
                ? "Pricing isn’t set up in Stripe for this tier yet. Saving here gets it ready for new signups."
                : "Current members roll over to the new amount at their next renewal. No mid-cycle charges."}
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

          {tier.stripePriceId ? null : (
            <p className="text-xs text-mppga-ink-muted">
              Not yet set up in Stripe.
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full">
            {isBootstrap ? "Set up in Stripe" : "Update dues"}
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

function BenefitRow({
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
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-md border border-mppga-divider bg-mppga-card px-3 py-2.5 text-sm transition-colors hover:border-mppga-teal/40"
    >
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

function PerksEditor({
  tierId,
  perks,
  onChange,
}: {
  tierId: string;
  perks: string[];
  onChange: (next: string[]) => void;
}) {
  function updateAt(index: number, value: string): void {
    const next = perks.slice();
    next[index] = value;
    onChange(next);
  }
  function removeAt(index: number): void {
    const next = perks.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [""]);
  }
  function swap(i: number, j: number): void {
    if (i < 0 || j < 0 || i >= perks.length || j >= perks.length) return;
    const a = perks[i] ?? "";
    const b = perks[j] ?? "";
    const next = perks.slice();
    next[i] = b;
    next[j] = a;
    onChange(next);
  }
  function moveUp(index: number): void {
    swap(index, index - 1);
  }
  function moveDown(index: number): void {
    swap(index, index + 1);
  }
  function add(): void {
    onChange([...perks, ""]);
  }

  return (
    <fieldset className="space-y-3 rounded-md border border-mppga-divider bg-mppga-page p-4">
      <legend className="px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mppga-ink-muted">
        Marketing bullets
      </legend>
      <p className="-mt-1 text-xs text-mppga-ink-soft">
        Shown under the tier on the public Join page. One bullet per line.
      </p>
      <ul className="space-y-2">
        {perks.map((perk, index) => {
          const inputId = `perk-${tierId}-${index}`;
          return (
            <li key={index} className="flex items-center gap-2">
              <div className="flex items-center overflow-hidden rounded-md border border-mppga-divider">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  aria-label="Move bullet up"
                  title="Move up"
                  className="flex h-9 w-8 items-center justify-center border-r border-mppga-divider text-mppga-ink-soft transition-colors hover:bg-mppga-teal-tint hover:text-mppga-teal-deep disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-mppga-ink-soft"
                >
                  <span aria-hidden>↑</span>
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === perks.length - 1}
                  aria-label="Move bullet down"
                  title="Move down"
                  className="flex h-9 w-8 items-center justify-center text-mppga-ink-soft transition-colors hover:bg-mppga-teal-tint hover:text-mppga-teal-deep disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-mppga-ink-soft"
                >
                  <span aria-hidden>↓</span>
                </button>
              </div>
              <input
                id={inputId}
                name="perks"
                type="text"
                value={perk}
                onChange={(e) => updateAt(index, e.target.value)}
                placeholder="e.g. Member event pricing"
                className="h-9 flex-1 rounded-md border border-mppga-divider bg-mppga-card px-3 text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label="Remove bullet"
                title="Remove"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-mppga-divider text-mppga-ink-soft transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              >
                <span aria-hidden>×</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md border border-mppga-divider bg-mppga-card px-3 py-1.5 text-xs font-medium text-mppga-teal-deep transition-colors hover:border-mppga-teal/40 hover:bg-mppga-teal-tint"
        >
          + Add bullet
        </button>
      </div>
    </fieldset>
  );
}

function SalonCoverageRow({
  tierId,
  checked,
  onCheckedChange,
  employeeLimit,
  onEmployeeLimitChange,
}: {
  tierId: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  employeeLimit: string;
  onEmployeeLimitChange: (next: string) => void;
}) {
  const toggleId = `salon-coverage-${tierId}`;
  const limitId = `employee-limit-${tierId}`;
  return (
    <div className="rounded-md border border-mppga-divider bg-mppga-card transition-colors hover:border-mppga-teal/40">
      <label
        htmlFor={toggleId}
        className="flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm"
      >
        <input
          id={toggleId}
          name="umbrella_account"
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-mppga-divider text-mppga-teal focus:ring-mppga-teal/40"
        />
        <span className="flex-1">
          <span className="block text-mppga-ink">Salon coverage</span>
          <span className="mt-0.5 block text-xs text-mppga-ink-soft">
            One membership covers a salon and its staff.
          </span>
        </span>
      </label>
      {checked ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-mppga-divider px-3 py-2.5 text-sm text-mppga-ink-soft">
          <label htmlFor={limitId} className="shrink-0">
            Covers a salon with up to
          </label>
          <input
            id={limitId}
            name="umbrella_employee_limit"
            type="number"
            min={1}
            step={1}
            required
            value={employeeLimit}
            onChange={(e) => onEmployeeLimitChange(e.target.value)}
            className="h-9 w-16 rounded-md border border-mppga-divider bg-mppga-card px-2 text-center text-sm text-mppga-ink focus:border-mppga-teal focus:outline-none focus:ring-2 focus:ring-mppga-teal/30"
          />
          <span className="shrink-0">employees.</span>
        </div>
      ) : null}
    </div>
  );
}
