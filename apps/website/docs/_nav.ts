export type DocLink = {
  title: string;
  href: string;
};

export type DocGroup = {
  title: string;
  items: DocLink[];
};

export const docsNav: DocGroup[] = [
  {
    title: "Overview",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Getting started", href: "/docs/getting-started" },
      { title: "Installation", href: "/docs/installation" },
    ],
  },
  {
    title: "Concepts",
    items: [
      { title: "Architecture", href: "/docs/architecture" },
      { title: "Project profiles", href: "/docs/profiles" },
      { title: "Configuration", href: "/docs/configuration" },
    ],
  },
  {
    title: "Reference",
    items: [
      { title: "CLI reference", href: "/docs/cli" },
      { title: "Plugins & ecosystem", href: "/docs/plugins" },
      { title: "Troubleshooting", href: "/docs/troubleshooting" },
    ],
  },
];

// Flat, ordered list used for prev/next navigation.
export const docsFlat: DocLink[] = docsNav.flatMap((g) => g.items);

export function getPrevNext(href: string): {
  prev: DocLink | null;
  next: DocLink | null;
} {
  const idx = docsFlat.findIndex((l) => l.href === href);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? docsFlat[idx - 1] : null,
    next: idx < docsFlat.length - 1 ? docsFlat[idx + 1] : null,
  };
}
