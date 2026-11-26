import AboutOverview from "./about/AboutOverview";
import HomeHero from "./HomeHero";
import SupportSection from "./components/SupportSection";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <HomeHero/>
      <AboutOverview/>
      <SupportSection
        email={process.env.SUPPORT_EMAIL?.trim()}
        phone={process.env.SUPPORT_PHONE?.trim()}
        github={process.env.SUPPORT_GITHUB?.trim()}/>
    </>
  );
}
