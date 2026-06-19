import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  className,
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={clsx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "border-fern/70 bg-fern text-ink-950 hover:bg-fern/90 focus:outline-none focus:ring-2 focus:ring-fern/40",
        variant === "secondary" &&
          "border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-brass/30",
        variant === "ghost" &&
          "border-transparent bg-transparent text-zinc-300 hover:bg-white/[0.06] hover:text-white",
        variant === "danger" &&
          "border-coral/40 bg-coral/15 text-coral hover:bg-coral/20 focus:outline-none focus:ring-2 focus:ring-coral/30",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
