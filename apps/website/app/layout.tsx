import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://martin-k-m.github.io/orbit";
// Matches next.config.mjs basePath so the favicon resolves under the Pages subpath.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Orbit — Your development workflow, unified.",
    template: "%s — Orbit",
  },
  description:
    "Orbit is a local-first developer command center for managing projects, tools, and workflows — no server, no telemetry, everything on your machine.",
  keywords: [
    "developer tools",
    "local-first",
    "command center",
    "project management",
    "Rust",
    "Tauri",
    "CLI",
    "developer productivity",
  ],
  authors: [{ name: "Orbit" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Orbit — Your development workflow, unified.",
    description:
      "A local-first developer command center for managing projects, tools, and workflows. No server, no telemetry, everything on your machine.",
    siteName: "Orbit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbit — Your development workflow, unified.",
    description:
      "A local-first developer command center. No server, no telemetry, everything on your machine.",
  },
  icons: {
    icon: `${basePath}/favicon.svg`,
  },
};

export const viewport: Viewport = {
  themeColor: "#08080B",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
