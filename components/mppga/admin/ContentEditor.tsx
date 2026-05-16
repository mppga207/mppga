"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw, Save } from "lucide-react";

import { Card } from "./Card";
import { Field, TextArea, TextInput } from "./Field";
import { Button } from "@/components/mppga/ui/button";
import {
  resetLandingContent,
  saveLandingContent,
} from "@/lib/admin/content-actions";
import {
  defaultLandingContent,
  type LandingContent,
  type LandingPillar,
  type LandingStat,
} from "@/lib/mppga/admin/landingContent";

function clone(content: LandingContent): LandingContent {
  return JSON.parse(JSON.stringify(content)) as LandingContent;
}

function isEqual(a: LandingContent, b: LandingContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface ContentEditorProps {
  initialContent: LandingContent;
  isDefault: boolean;
  updatedAt: string | null;
}

export function ContentEditor({
  initialContent,
  isDefault,
  updatedAt,
}: ContentEditorProps) {
  const [baseline, setBaseline] = useState<LandingContent>(() =>
    clone(initialContent),
  );
  const [content, setContent] = useState<LandingContent>(() =>
    clone(initialContent),
  );
  const [flash, setFlash] = useState<
    { tone: "ok" | "error"; message: string } | null
  >(null);
  const [savedAt, setSavedAt] = useState<string | null>(updatedAt);
  const [siteIsDefault, setSiteIsDefault] = useState(isDefault);
  const [pending, startTransition] = useTransition();

  const isDirty = useMemo(() => !isEqual(content, baseline), [content, baseline]);

  function patchSection<S extends keyof LandingContent>(
    section: S,
    patch: Partial<LandingContent[S]>,
  ) {
    setContent((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...patch },
    }));
  }

  function patchStat<K extends keyof LandingStat>(
    index: number,
    key: K,
    value: LandingStat[K],
  ) {
    setContent((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        items: prev.stats.items.map((item, i) =>
          i === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  }

  function patchObjective(index: number, value: string) {
    setContent((prev) => ({
      ...prev,
      ourPurpose: {
        ...prev.ourPurpose,
        objectives: prev.ourPurpose.objectives.map((obj, i) =>
          i === index ? value : obj,
        ),
      },
    }));
  }

  function patchPillar<K extends keyof LandingPillar>(
    index: number,
    key: K,
    value: LandingPillar[K],
  ) {
    setContent((prev) => ({
      ...prev,
      pillars: {
        ...prev.pillars,
        items: prev.pillars.items.map((item, i) =>
          i === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  }

  function handleReset() {
    setContent(clone(baseline));
    setFlash(null);
  }

  function handleSave() {
    setFlash(null);
    startTransition(async () => {
      const result = await saveLandingContent(content);
      if (result.status === "ok") {
        setBaseline(clone(content));
        setSavedAt(result.updatedAt);
        setSiteIsDefault(false);
        setFlash({
          tone: "ok",
          message: "Saved. Public pages pick up the new copy on next request.",
        });
      } else {
        setFlash({ tone: "error", message: result.reason });
      }
    });
  }

  function handleResetToDefaults() {
    if (
      !confirm(
        "Reset the live site copy to the defaults? This wipes any saved edits.",
      )
    ) {
      return;
    }
    setFlash(null);
    startTransition(async () => {
      const result = await resetLandingContent();
      if (result.status === "ok") {
        const fresh = clone(defaultLandingContent);
        setBaseline(fresh);
        setContent(fresh);
        setSavedAt(result.updatedAt);
        setSiteIsDefault(true);
        setFlash({
          tone: "ok",
          message: "Reset to defaults. Live site reverted.",
        });
      } else {
        setFlash({ tone: "error", message: result.reason });
      }
    });
  }

  return (
    <>
      <div className="space-y-6 pb-32">
        <Card
          title="Hero"
          description="Top of the landing — headline, sub-copy, and primary CTAs."
        >
          <div className="space-y-6 px-6 py-6">
            <Field
              label="Eyebrow"
              helper="Small label that sits above the headline."
            >
              <TextInput
                value={content.hero.eyebrow}
                onChange={(v) => patchSection("hero", { eyebrow: v })}
              />
            </Field>

            <Field label="Headline">
              <TextArea
                value={content.hero.headline}
                onChange={(v) => patchSection("hero", { headline: v })}
                rows={2}
              />
            </Field>

            <Field
              label="Sub-copy"
              helper="The paragraph under the headline."
            >
              <TextArea
                value={content.hero.subCopy}
                onChange={(v) => patchSection("hero", { subCopy: v })}
                rows={3}
              />
            </Field>

            <Field label="Primary button label">
              <TextInput
                value={content.hero.primaryButtonLabel}
                onChange={(v) =>
                  patchSection("hero", { primaryButtonLabel: v })
                }
              />
            </Field>

            <Field label="Secondary button label">
              <TextInput
                value={content.hero.secondaryButtonLabel}
                onChange={(v) =>
                  patchSection("hero", { secondaryButtonLabel: v })
                }
              />
            </Field>

            <Field
              label="Photo caption"
              helper="Shown over the hero image placeholder."
            >
              <TextInput
                value={content.hero.photoCaption}
                onChange={(v) => patchSection("hero", { photoCaption: v })}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="By the numbers"
          description="The four credibility stats that sit just below the hero."
        >
          <div className="space-y-6 px-6 py-6">
            <Field label="Eyebrow">
              <TextInput
                value={content.stats.eyebrow}
                onChange={(v) => patchSection("stats", { eyebrow: v })}
              />
            </Field>

            <div className="space-y-5">
              {content.stats.items.map((stat, index) => (
                <div
                  key={index}
                  className="rounded-md border border-mppga-divider p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                    Stat {String(index + 1).padStart(2, "0")}
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
                    <Field label="Value">
                      <TextInput
                        value={stat.value}
                        onChange={(v) => patchStat(index, "value", v)}
                      />
                    </Field>
                    <Field label="Suffix" helper="Optional. Example: +">
                      <TextInput
                        value={stat.suffix}
                        onChange={(v) => patchStat(index, "suffix", v)}
                      />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Label">
                      <TextInput
                        value={stat.label}
                        onChange={(v) => patchStat(index, "label", v)}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title="Who we are"
          description="The two-paragraph intro plus the highlighted mission quote."
        >
          <div className="space-y-6 px-6 py-6">
            <Field label="Eyebrow">
              <TextInput
                value={content.whoWeAre.eyebrow}
                onChange={(v) => patchSection("whoWeAre", { eyebrow: v })}
              />
            </Field>

            <Field label="Headline">
              <TextArea
                value={content.whoWeAre.headline}
                onChange={(v) => patchSection("whoWeAre", { headline: v })}
                rows={2}
              />
            </Field>

            <Field label="Paragraph 1">
              <TextArea
                value={content.whoWeAre.paragraph1}
                onChange={(v) => patchSection("whoWeAre", { paragraph1: v })}
                rows={5}
              />
            </Field>

            <Field label="Paragraph 2">
              <TextArea
                value={content.whoWeAre.paragraph2}
                onChange={(v) => patchSection("whoWeAre", { paragraph2: v })}
                rows={4}
              />
            </Field>

            <Field
              label="Mission quote"
              helper="Highlighted callout to the right of the paragraphs."
            >
              <TextArea
                value={content.whoWeAre.quote}
                onChange={(v) => patchSection("whoWeAre", { quote: v })}
                rows={3}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Our purpose"
          description="The dark teal panel with the four numbered objectives."
        >
          <div className="space-y-6 px-6 py-6">
            <Field label="Eyebrow">
              <TextInput
                value={content.ourPurpose.eyebrow}
                onChange={(v) => patchSection("ourPurpose", { eyebrow: v })}
              />
            </Field>

            <Field label="Headline">
              <TextInput
                value={content.ourPurpose.headline}
                onChange={(v) => patchSection("ourPurpose", { headline: v })}
              />
            </Field>

            <div className="space-y-5">
              {content.ourPurpose.objectives.map((objective, index) => (
                <div
                  key={index}
                  className="rounded-md border border-mppga-divider p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                    Objective {String(index + 1).padStart(2, "0")}
                  </p>
                  <div className="mt-3">
                    <Field label="Copy">
                      <TextArea
                        value={objective}
                        onChange={(v) => patchObjective(index, v)}
                        rows={2}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title="Three pillars"
          description="The Community, Safety, and Education cards in the &lsquo;What we do&rsquo; row."
        >
          <div className="space-y-6 px-6 py-6">
            <Field label="Eyebrow">
              <TextInput
                value={content.pillars.eyebrow}
                onChange={(v) => patchSection("pillars", { eyebrow: v })}
              />
            </Field>

            <Field label="Headline">
              <TextInput
                value={content.pillars.headline}
                onChange={(v) => patchSection("pillars", { headline: v })}
              />
            </Field>

            <div className="space-y-5">
              {content.pillars.items.map((pillar, index) => (
                <div
                  key={index}
                  className="rounded-md border border-mppga-divider p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-mppga-teal">
                    Pillar {String(index + 1).padStart(2, "0")}
                  </p>
                  <div className="mt-4 space-y-4">
                    <Field label="Title">
                      <TextInput
                        value={pillar.title}
                        onChange={(v) => patchPillar(index, "title", v)}
                      />
                    </Field>
                    <Field label="Body">
                      <TextArea
                        value={pillar.body}
                        onChange={(v) => patchPillar(index, "body", v)}
                        rows={3}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title="Events teaser"
          description="Header copy above the three event preview cards. The events themselves come from the Events tab."
        >
          <div className="space-y-6 px-6 py-6">
            <Field label="Eyebrow">
              <TextInput
                value={content.events.eyebrow}
                onChange={(v) => patchSection("events", { eyebrow: v })}
              />
            </Field>

            <Field label="Headline">
              <TextInput
                value={content.events.headline}
                onChange={(v) => patchSection("events", { headline: v })}
              />
            </Field>

            <Field
              label="See-all link label"
              helper="Top-right link that points to the full events page."
            >
              <TextInput
                value={content.events.ctaLabel}
                onChange={(v) => patchSection("events", { ctaLabel: v })}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Closing call to action"
          description="The dark teal band near the bottom of the page."
        >
          <div className="space-y-6 px-6 py-6">
            <Field label="Headline">
              <TextInput
                value={content.closingCta.headline}
                onChange={(v) => patchSection("closingCta", { headline: v })}
              />
            </Field>

            <Field label="Supporting copy">
              <TextArea
                value={content.closingCta.body}
                onChange={(v) => patchSection("closingCta", { body: v })}
                rows={3}
              />
            </Field>

            <Field label="Button label">
              <TextInput
                value={content.closingCta.buttonLabel}
                onChange={(v) =>
                  patchSection("closingCta", { buttonLabel: v })
                }
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Footer"
          description="The mailing block and contact details shown on every page."
        >
          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Association label">
                <TextInput
                  value={content.footer.associationLabel}
                  onChange={(v) =>
                    patchSection("footer", { associationLabel: v })
                  }
                />
              </Field>
              <Field label="Contact label">
                <TextInput
                  value={content.footer.contactLabel}
                  onChange={(v) =>
                    patchSection("footer", { contactLabel: v })
                  }
                />
              </Field>
            </div>

            <Field label="Association name">
              <TextInput
                value={content.footer.associationLine1}
                onChange={(v) =>
                  patchSection("footer", { associationLine1: v })
                }
              />
            </Field>

            <Field label="Mailing address">
              <TextInput
                value={content.footer.associationLine2}
                onChange={(v) =>
                  patchSection("footer", { associationLine2: v })
                }
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email">
                <TextInput
                  value={content.footer.contactEmail}
                  onChange={(v) =>
                    patchSection("footer", { contactEmail: v })
                  }
                />
              </Field>
              <Field label="Contact phone">
                <TextInput
                  value={content.footer.contactPhone}
                  onChange={(v) =>
                    patchSection("footer", { contactPhone: v })
                  }
                />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-mppga-divider bg-mppga-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-mppga-ink-soft">
              {pending
                ? "Saving…"
                : isDirty
                  ? "Unsaved changes"
                  : siteIsDefault
                    ? "Showing defaults — no saved edits"
                    : "Live"}
            </p>
            {savedAt ? (
              <p className="text-xs text-mppga-ink-muted">
                Last saved{" "}
                {new Date(savedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
            {flash ? (
              <span
                className={`text-xs ${
                  flash.tone === "ok"
                    ? "text-mppga-teal-deep"
                    : "text-mppga-ink"
                }`}
              >
                {flash.message}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleResetToDefaults}
              disabled={pending || siteIsDefault}
            >
              Reset to defaults
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={pending || !isDirty}
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
              Discard
            </Button>
            <Button
              variant="primary"
              disabled={pending || !isDirty}
              onClick={handleSave}
            >
              <Save className="h-4 w-4" strokeWidth={1.8} />
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
