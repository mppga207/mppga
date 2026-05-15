"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Card } from "./Card";
import { Field, TextArea, TextInput } from "./Field";
import { Button } from "@/components/mppga/ui/button";
import {
  defaultLandingContent,
  type LandingContent,
  type LandingStat,
} from "@/lib/mppga/admin/landingContent";

function cloneContent(content: LandingContent): LandingContent {
  return {
    hero: { ...content.hero },
    stats: {
      eyebrow: content.stats.eyebrow,
      items: content.stats.items.map((item) => ({ ...item })),
    },
  };
}

function isEqual(a: LandingContent, b: LandingContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ContentEditor() {
  const [content, setContent] = useState<LandingContent>(() =>
    cloneContent(defaultLandingContent),
  );

  const isDirty = useMemo(
    () => !isEqual(content, defaultLandingContent),
    [content],
  );

  function patchHero<K extends keyof LandingContent["hero"]>(
    key: K,
    value: LandingContent["hero"][K],
  ) {
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, [key]: value } }));
  }

  function patchStat<K extends keyof LandingStat>(
    index: number,
    key: K,
    value: LandingStat[K],
  ) {
    setContent((prev) => {
      const items = prev.stats.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      );
      return { ...prev, stats: { ...prev.stats, items } };
    });
  }

  function handleReset() {
    setContent(cloneContent(defaultLandingContent));
  }

  return (
    <>
      <div className="space-y-6 pb-32">
        <div className="flex gap-3 rounded-md border border-mppga-sand-deep bg-mppga-sand p-4 text-sm text-mppga-teal-darker">
          <span aria-hidden className="mt-0.5 text-mppga-gold">
            ⓘ
          </span>
          <div>
            <p className="font-medium">Demo mode — changes won&rsquo;t persist yet.</p>
            <p className="mt-1 text-mppga-ink-soft">
              The form below mirrors the final editor. Once Supabase is connected
              (Phase 2), Save will push edits straight to the public landing in
              real time.
            </p>
          </div>
        </div>

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
                onChange={(v) => patchHero("eyebrow", v)}
              />
            </Field>

            <Field label="Headline">
              <TextArea
                value={content.hero.headline}
                onChange={(v) => patchHero("headline", v)}
                rows={2}
              />
            </Field>

            <Field
              label="Sub-copy"
              helper="A statewide nonprofit 501(c)(6) created by and for Maine groomers — built on education, professionalism, safety, and community."
            >
              <TextArea
                value={content.hero.subCopy}
                onChange={(v) => patchHero("subCopy", v)}
                rows={3}
              />
            </Field>

            <Field label="Primary button label">
              <TextInput
                value={content.hero.primaryButtonLabel}
                onChange={(v) => patchHero("primaryButtonLabel", v)}
              />
            </Field>

            <Field label="Secondary button label">
              <TextInput
                value={content.hero.secondaryButtonLabel}
                onChange={(v) => patchHero("secondaryButtonLabel", v)}
              />
            </Field>

            <Field
              label="Photo caption"
              helper="Shown over the hero image placeholder."
            >
              <TextInput
                value={content.hero.photoCaption}
                onChange={(v) => patchHero("photoCaption", v)}
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
                onChange={(v) =>
                  setContent((prev) => ({
                    ...prev,
                    stats: { ...prev.stats, eyebrow: v },
                  }))
                }
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
