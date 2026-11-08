import type { Route } from "@frostjs/core";
import { Header } from "../components/Header.js";
import { NAV_ITEMS, type NavItem } from "../config/nav.js";
import "../styles/app.css";

export const loader = async (): Promise<{ nav: NavItem[] }> => ({
  nav: NAV_ITEMS,
});

interface LayoutData {
  nav: NavItem[];
}

export default function RootLayout({
  children,
  data,
}: Route.ComponentProps<LayoutData>): React.JSX.Element {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header items={data.nav} />
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
