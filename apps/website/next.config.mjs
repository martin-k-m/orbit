// GitHub Pages serves a project site under a subpath (e.g. /orbit). The deploy
// workflow sets NEXT_PUBLIC_BASE_PATH=/orbit; locally it is empty so dev runs at
// the root. basePath/assetPrefix make Next emit correct asset and link URLs.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
