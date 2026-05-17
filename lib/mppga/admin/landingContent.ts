export type LandingStat = {
  value: string;
  suffix: string;
  label: string;
};

export type LandingPillar = {
  title: string;
  body: string;
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
  whoWeAre: {
    eyebrow: string;
    headline: string;
    paragraph1: string;
    paragraph2: string;
    quote: string;
  };
  ourPurpose: {
    eyebrow: string;
    headline: string;
    objectives: string[];
  };
  pillars: {
    eyebrow: string;
    headline: string;
    items: LandingPillar[];
  };
  events: {
    eyebrow: string;
    headline: string;
    ctaLabel: string;
  };
  closingCta: {
    headline: string;
    body: string;
    buttonLabel: string;
  };
  footer: {
    associationLabel: string;
    associationLine1: string;
    associationLine2: string;
    contactLabel: string;
    contactEmail: string;
    contactPhone: string;
  };
};

export const defaultLandingContent: LandingContent = {
  hero: {
    eyebrow: "Maine Professional Pet Groomers Association",
    headline: "Maine's professional voice for groomers.",
    subCopy:
      "A statewide nonprofit 501(c)(6) created by and for Maine groomers — built on education, professionalism, safety, and community.",
    primaryButtonLabel: "Join Now",
    secondaryButtonLabel: "See upcoming events",
    photoCaption: "Photo placeholder · groomer at work",
  },
  stats: {
    eyebrow: "By the numbers",
    items: [
      { value: "0", suffix: "", label: "Members" },
      { value: "0", suffix: "", label: "Towns served" },
      { value: "0", suffix: "", label: "Events this year" },
      { value: "501(c)(6)", suffix: "", label: "Nonprofit status" },
    ],
  },
  whoWeAre: {
    eyebrow: "Who we are",
    headline: "Built by Maine groomers, for Maine groomers.",
    paragraph1:
      "The Maine Professional Pet Groomers Association (MPPGA) is a growing statewide organization created by and for professional pet groomers in Maine. We're being established as a nonprofit 501(c)(6) professional association — a membership-based nonprofit devoted to promoting the common business interests of professional groomers and enhancing the standards of the grooming industry.",
    paragraph2:
      "MPPGA brings together salon owners, mobile stylists, apprentices, educators, and experienced professionals to strengthen the craft of pet grooming in Maine and promote growth in the industry for years to come.",
    quote:
      "Our mission is to support and elevate the grooming profession by fostering education, professionalism, safety, and community among groomers across the state.",
  },
  ourPurpose: {
    eyebrow: "Our purpose",
    headline: "MPPGA exists to:",
    objectives: [
      "Promote advancement in all areas of groomer education and best practices.",
      "Encourage professionalism, humane animal care, and high standards in groomer conduct.",
      "Build a strong network of Maine groomers who share knowledge, resources, and opportunities.",
      "Advocate for consistent safety and sanitation practices that protect pets, groomers, and the public.",
    ],
  },
  pillars: {
    eyebrow: "What we do",
    headline: "Three pillars.",
    items: [
      {
        title: "Community & Support",
        body: "Connecting groomers, salon owners, mobile stylists, educators, and apprentices throughout Maine for collaboration, support, and professional advancement.",
      },
      {
        title: "Safety & Standards",
        body: "We embrace the PPGSA Standards of Care, Safety and Sanitation — created by grooming professionals to ensure humane practice and clean, safe environments for pets in every salon.",
      },
      {
        title: "Education & Growth",
        body: "We support continuing education, workshops, and professional development that helps Maine groomers stay connected and thrive.",
      },
    ],
  },
  events: {
    eyebrow: "Events",
    headline: "Upcoming events.",
    ctaLabel: "See all events",
  },
  closingCta: {
    headline: "Become a member.",
    body: "Join 100+ Maine groomers who back the standard, share the work, and point clients toward each other.",
    buttonLabel: "Join Now",
  },
  footer: {
    associationLabel: "Association",
    associationLine1: "Maine Professional Pet Groomers Association",
    associationLine2: "PO Box —, Portland, ME",
    contactLabel: "Contact",
    contactEmail: "mppga207@gmail.com",
    contactPhone: "(207) 555-0117",
  },
};
