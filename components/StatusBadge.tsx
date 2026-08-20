import { cn } from "@/lib/utils";
import type { HelpStatus } from "@/lib/types";

const STYLES: Record<HelpStatus, string> = {
  Yes: "bg-topi-orange-500/15 text-topi-orange-300 border-topi-orange-500/40",
  Pending: "bg-topi-amber/10 text-topi-amber border-topi-amber/30",
  No: "bg-topi-surface-3 text-topi-muted border-topi-border-strong",
};

export default function StatusBadge({ status }: { status: HelpStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        STYLES[status]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "Yes" && "bg-topi-orange-400",
          status === "Pending" && "bg-topi-amber",
          status === "No" && "bg-topi-faint"
        )}
      />
      {status === "Yes" ? "Helped" : status}
    </span>
  );
}
