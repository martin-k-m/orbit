import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { TrustStrip, StackStrip } from "@/components/Strips";
import { FeatureGrid } from "@/components/FeatureGrid";
import { ProductDemo } from "@/components/ProductDemo";
import { EcosystemDiagram } from "@/components/EcosystemDiagram";
import { CliShowcase } from "@/components/CliShowcase";
import { DownloadSection } from "@/components/DownloadSection";
import { OpenSource } from "@/components/OpenSource";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <FeatureGrid />
        <ProductDemo />
        <StackStrip />
        <EcosystemDiagram />
        <CliShowcase />
        <DownloadSection />
        <OpenSource />
      </main>
      <Footer />
    </>
  );
}
