import type { Route } from "@frost.js/core";

const nav = [
  { label: "Home", href: "/" },
  { label: "Playground", href: "/playground" },
];

export default function RootLayout({ children }: Route.ComponentProps): React.JSX.Element {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <nav style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        {nav.map((item) => (
          <a key={item.href} href={item.href} style={{ color: "#0e7490" }}>
            {item.label}
          </a>
        ))}
      </nav>
      {children}
    </div>
  );
}
