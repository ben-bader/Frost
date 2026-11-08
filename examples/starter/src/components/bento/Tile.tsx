import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Tile({
  icon: Icon,
  label,
  chip,
  chipClass = "border-mint/40 bg-mint/10 text-mint",
  children,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  chip: string;
  chipClass?: string;
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <section
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-white/15 bg-teal-950/55 backdrop-blur ${className}`}
    >
      <header className="flex h-11 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
        <Icon size={14} className="text-ink-lo" aria-hidden="true" />
        <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-body">
          {label}
        </h2>
        {chip && (
          <span
            className={`ml-auto rounded-pill border px-2 py-0.5 font-mono text-[0.65rem] font-bold uppercase tracking-wider ${chipClass}`}
          >
            {chip}
          </span>
        )}
      </header>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </section>
  );
}
