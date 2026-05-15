"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Card } from "./Card";
import { Field, TextArea, TextInput } from "./Field";
import { Button } from "@/components/mppga/ui/button";
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

export function ContentEditor() {
  const [content, setContent] = useState<LandingContent>(() =>
    clone(defaultLandingContent),
  );

  const isDirty = useMemo(
    () => !isEqual(content, defaultLandingContent),
    [content],
  );

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
    setContent(clone(defaultLandingContent));
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
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-3">
          <p className="text-sm text-mppga-ink-soft">
            {isDirty ? "Unsaved changes" : "No changes"}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={!isDirty}
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
              Reset
            </Button>
            <Button
              variant="primary"
              disabled={!isDirty}
              onClick={() => {
                /* Persistence lands in Phase 2 (Supabase wiring). */
              }}
            >
              <Save className="h-4 w-4" strokeWidth={1.8} />
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
