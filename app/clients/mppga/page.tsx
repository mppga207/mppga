import { ClosingCTA } from "@/components/mppga/landing/ClosingCTA";
import { EventsTeaser } from "@/components/mppga/landing/EventsTeaser";
import { ExistsTo } from "@/components/mppga/landing/ExistsTo";
import { Footer } from "@/components/mppga/landing/Footer";
import { Hero } from "@/components/mppga/landing/Hero";
import { Nav } from "@/components/mppga/landing/Nav";
import { Stats } from "@/components/mppga/landing/Stats";
import { WhoWeAre } from "@/components/mppga/landing/WhoWeAre";
import { WhyJoin } from "@/components/mppga/landing/WhyJoin";

export default function MppgaLandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <WhoWeAre />
        <ExistsTo />
        <WhyJoin />
        <EventsTeaser />
        <ClosingCTA />
      </main>
      <Footer />
    </>
  );
}
