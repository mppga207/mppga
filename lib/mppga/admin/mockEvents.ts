export type MockEvent = {
  id: string;
  title: string;
  location: string;
  date: string;
  endDate?: string;
  description: string;
  memberPrice: number;
  guestPrice: number;
  rsvps: number;
  capacity: number;
  status: "Published" | "Draft";
};

export const mockEvents: readonly MockEvent[] = [
  {
    id: "safe-handling-workshop",
    title: "Safe Handling Workshop",
    location: "Portland, ME",
    date: "2026-06-14T13:00:00-04:00",
    endDate: "2026-06-14T17:00:00-04:00",
    description:
      "A hands-on afternoon covering low-stress restraint, fear-free positioning, and how to read canine body language under the grooming arm. Bring questions about your trickiest clients — we'll work through them together.",
    memberPrice: 2000,
    guestPrice: 4000,
    rsvps: 18,
    capacity: 30,
    status: "Published",
  },
  {
    id: "hand-scissoring-clinic",
    title: "Hand-Scissoring Clinic",
    location: "Bangor, ME",
    date: "2026-07-09T10:00:00-04:00",
    endDate: "2026-07-09T16:00:00-04:00",
    description:
      "A full-day technical clinic on hand-scissoring for finish work. Expect to scissor live dogs, get one-on-one feedback, and walk out with a set of techniques you can apply Monday morning. Limited seats so every attendee gets table time.",
    memberPrice: 6000,
    guestPrice: 9000,
    rsvps: 9,
    capacity: 16,
    status: "Published",
  },
  {
    id: "statewide-member-mixer",
    title: "Statewide Member Mixer",
    location: "Augusta, ME",
    date: "2026-09-20T17:00:00-04:00",
    endDate: "2026-09-20T20:00:00-04:00",
    description:
      "An evening of food, drinks, and conversation with groomers from across Maine. Casual format, no agenda — just a chance to meet the people behind the names you see on the directory and trade notes on what's working in your shop.",
    memberPrice: 0,
    guestPrice: 2500,
    rsvps: 42,
    capacity: 80,
    status: "Published",
  },
  {
    id: "fall-grooming-summit",
    title: "Fall Grooming Summit",
    location: "Rockland, ME",
    date: "2026-10-18T09:00:00-04:00",
    endDate: "2026-10-19T16:00:00-04:00",
    description:
      "Two-day summit with guest instructors, breed-specific breakouts, and a vendor showcase. Full schedule and instructor bios released closer to the date.",
    memberPrice: 8500,
    guestPrice: 12500,
    rsvps: 0,
    capacity: 60,
    status: "Draft",
  },
] as const;
