import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-mono text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "h-10 bg-mint px-5 text-mint-ink hover:bg-mint-hover",
  ghost: "h-10 border border-mint/70 bg-transparent px-5 text-mint hover:bg-mint/10",
  danger: "h-10 border border-danger/70 bg-transparent px-5 text-danger hover:bg-danger-tint",
  icon: "h-10 w-10 border border-line bg-transparent text-ink-body hover:bg-teal-800 hover:text-ink-hi",
};

export const pillPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-pill bg-mint px-5 font-mono text-xs font-bold uppercase tracking-wider text-mint-ink whitespace-nowrap transition-colors duration-150 hover:bg-mint-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint";

export const pillGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-pill border border-mint/70 bg-transparent px-5 font-mono text-xs font-bold uppercase tracking-wider text-mint whitespace-nowrap transition-colors duration-150 hover:bg-mint/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", children, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
});
