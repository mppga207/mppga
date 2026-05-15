export type LandingStat = {
  value: string;
  suffix: string;
  label: string;
};

export type LandingContent = {
  hero: {
    eyebrow: string;
    headline: string;
    subCopy: string;
    primaryButtonLabel: string;
    secondaryButtonLabel: string;
    photoCaption: string;
  };
  stats: {
    eyebrow: string;
    items: LandingStat[];
  };
};

export const defaultLandingContent: LandingContent = {
  hero: {
    eyebrow: "Maine Professional Pet Groomers Association",
    headline: "Maine's professional voice for groomers.",
    subCopy:
      "A statewide nonprofit 501(c)(6) created by and for Maine groomers — built on education, professionalism, safety, and community.",
    primaryButtonLabel: "Join Now — $45/yr",
    secondaryButtonLabel: "See upcoming events",
    photoCaption: "Photo placeholder · groomer at work",
  },
  stats: {
    eyebrow: "By the numbers",
    items: [
      { value: "127", suffix: "+", label: "Maine groomers" },
      { value: "16", suffix: "", label: "Counties served" },
      { value: "12", suffix: "", label: "Events per year" },
      { value: "501(c)(6)", suffix: "", label: "Nonprofit status" },
    ],
  },
};
