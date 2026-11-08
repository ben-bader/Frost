import type { Route } from "@frost.js/core";
import "../styles/app.css";

const nav = [
  { label: "Home", href: "/" },
  { label: "Playground", href: "/playground" },
];

export default function RootLayout({ children }: Route.ComponentProps): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 font-sans">
      <nav className="mb-8 flex gap-4">
        {nav.map((item) => (
          <a key={item.href} href={item.href} className="text-cyan-700 underline">
            {item.label}
          </a>
        ))}
      </nav>
      {children}
    </div>
  );
}
