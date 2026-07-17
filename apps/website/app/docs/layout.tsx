import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DocsSidebar } from "@/components/DocsSidebar";

export const metadata: Metadata = {
  title: {
    default: "Documentation",
    template: "%s — Orbit Docs",
  },
  description:
    "Documentation for Orbit — the local-first developer command center. Installation, CLI reference, architecture, and more.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row">
        <DocsSidebar />
        <main className="min-w-0 flex-1 px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <article className="mx-auto max-w-3xl">{children}</article>
        </main>
      </div>
      <Footer />
    </>
  );
}
