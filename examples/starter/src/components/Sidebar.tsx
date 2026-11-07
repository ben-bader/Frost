import React from "react";
import { usePathname } from "@frostjs/react";

interface NavItem {
  label: string;
  href: string;
  badge?: string;
  icon?: string;
}

const navItems: NavItem[] = [
  { label: "Overview & Architecture", href: "/", icon: "❄️" },
  { label: "Server-Side Rendering", href: "/examples/ssr", badge: "SSR", icon: "⚡" },
  { label: "Client Hydration", href: "/examples/hydration", badge: "Client", icon: "💧" },
  { label: "Interactive Counter", href: "/examples/counter", icon: "🔢" },
  { label: "API Endpoints", href: "/examples/api", badge: "REST", icon: "🔌" },
  { label: "Module Boundaries", href: "/examples/boundaries", badge: "FS1004", icon: "🛡️" },
];

export function Sidebar(): React.JSX.Element {
  const currentPath = usePathname();

  return (
    <aside
      style={{
        width: "270px",
        minWidth: "270px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            fontWeight: 700,
            padding: "0 12px 10px",
          }}
        >
          Playground Navigation
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? currentPath === "/"
                : currentPath.startsWith(item.href);

            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  background: isActive ? "rgba(56, 189, 248, 0.12)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--accent-cyan)" : "3px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.05rem" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontWeight: 600,
                      background: isActive ? "rgba(56, 189, 248, 0.25)" : "var(--bg-card)",
                      color: isActive ? "var(--accent-cyan)" : "var(--text-muted)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      <div
        style={{
          marginTop: "auto",
          background: "var(--bg-card)",
          borderRadius: "8px",
          padding: "14px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
          Runtime Information
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div>Engine: <strong>Vite 6 + React 19</strong></div>
          <div>Adapter: <strong>@frostjs/adapter-node</strong></div>
          <div>Mode: <strong>Host-Independent SSR</strong></div>
        </div>
      </div>
    </aside>
  );
}
