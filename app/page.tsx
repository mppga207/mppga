import { Nav } from "@/components/mppga/landing/Nav";
import { Hero } from "@/components/mppga/landing/Hero";
import { Stats } from "@/components/mppga/landing/Stats";
import { WhoWeAre } from "@/components/mppga/landing/WhoWeAre";
import { ExistsTo } from "@/components/mppga/landing/ExistsTo";
import { WhyJoin } from "@/components/mppga/landing/WhyJoin";
import { EventsTeaser } from "@/components/mppga/landing/EventsTeaser";
import { ClosingCTA } from "@/components/mppga/landing/ClosingCTA";
import { Footer } from "@/components/mppga/landing/Footer";

export default function MppgaHome() {
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
