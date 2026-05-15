export type MockEvent = {
  id: string;
  title: string;
  location: string;
  date: string;
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
    memberPrice: 6000,
    guestPrice: 9000,
    rsvps: 9,
    capacity: 16,
    status: "Published",
  },
  {
    id: "annual-meeting",
    title: "Annual Meeting & Member Mixer",
    location: "Augusta, ME",
    date: "2026-09-20T17:00:00-04:00",
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
    memberPrice: 8500,
    guestPrice: 12500,
    rsvps: 0,
    capacity: 60,
    status: "Draft",
  },
] as const;
