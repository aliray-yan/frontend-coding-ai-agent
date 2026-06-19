import clsx from "clsx";

export function StatusPill({
  tone,
  children
}: {
  tone: "good" | "warn" | "bad" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium",
        tone === "good" && "border-fern/40 bg-fern/15 text-fern",
        tone === "warn" && "border-brass/40 bg-brass/15 text-brass",
        tone === "bad" && "border-coral/40 bg-coral/15 text-coral",
        tone === "neutral" && "border-white/10 bg-white/[0.05] text-zinc-300"
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          tone === "good" && "bg-fern",
          tone === "warn" && "bg-brass",
          tone === "bad" && "bg-coral",
          tone === "neutral" && "bg-zinc-400"
        )}
      />
      {children}
    </span>
  );
}
