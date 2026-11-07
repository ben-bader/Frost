import React from "react";

interface PanelProps {
  title: string;
  children: React.ReactNode;
  flush?: boolean;
}

export function Panel({ title, children, flush }: PanelProps): React.JSX.Element {
  return (
    <section className="panel" aria-label={title}>
      <div className="panel__head">{title}</div>
      <div className={`panel__body${flush ? " panel__body--flush" : ""}`}>{children}</div>
    </section>
  );
}
