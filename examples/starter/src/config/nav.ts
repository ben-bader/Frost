export interface NavItem {
  label: string;
  href: string;
}

/** Primary navigation — loaded by the root layout loader. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Demo", href: "/" },
  { label: "Playground", href: "/playground" },
];
