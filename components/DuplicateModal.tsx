"use client";

import { Copy, ShieldCheck, GitMerge, UserRoundSearch } from "lucide-react";
import { displayValue } from "@/lib/utils";
import type { DuplicateResolution, Lala, ParsedRow } from "@/lib/types";

interface DuplicateModalProps {
  open: boolean;
  row: ParsedRow;
  existing: Lala;
  matchedOn: "cnic" | "phone_number" | "both";
  position: number;
  total: number;
  busy: boolean;
  onResolve: (action: DuplicateResolution) => void;
  onResolveAll: (action: DuplicateResolution) => void;
}

const MATCH_LABEL: Record<DuplicateModalProps["matchedOn"], string> = {
  cnic: "matching CNIC",
  phone_number: "matching phone number",
  both: "matching CNIC and phone number",
};

function FieldRow({ label, oldValue, newValue }: { label: string; oldValue: string; newValue: string }) {
  const changed = oldValue.trim() !== newValue.trim() && newValue.trim() !== "";
  return (
    <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-2 py-1.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-topi-faint">{label}</span>
      <span className="truncate text-topi-muted">{displayValue(oldValue)}</span>
      <span className={changed ? "truncate font-medium text-topi-orange-300" : "truncate text-topi-muted"}>
        {displayValue(newValue)}
      </span>
    </div>
  );
}

export default function DuplicateModal({
  open,
  row,
  existing,
  matchedOn,
  position,
  total,
  busy,
  onResolve,
  onResolveAll,
}: DuplicateModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-topi-border-strong bg-topi-surface-2 p-6 shadow-card animate-rise-in">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-topi-orange-500/10 text-topi-orange-400">
            <UserRoundSearch size={20} />
          </div>
          <div>
            <h2 id="duplicate-modal-title" className="text-base font-semibold text-topi-text">
              Possible duplicate found
            </h2>
            <p className="text-xs text-topi-faint">
              Entry {position} of {total} · {MATCH_LABEL[matchedOn]}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-topi-muted">
          <span className="font-medium text-topi-text">{displayValue(row.name)}</span> from your upload
          looks like it&apos;s already in the database as{" "}
          <span className="font-medium text-topi-text">{displayValue(existing.name)}</span>. Choose how to
          handle it.
        </p>

        <div className="mt-4 rounded-xl border border-topi-border bg-topi-surface p-3">
          <div className="grid grid-cols-[80px_1fr_1fr] gap-2 border-b border-topi-border pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-topi-faint">
            <span>Field</span>
            <span>On file</span>
            <span>Uploaded</span>
          </div>
          <FieldRow label="Name" oldValue={existing.name ?? ""} newValue={row.name} />
          <FieldRow label="Phone" oldValue={existing.phone_number ?? ""} newValue={row.phone_number} />
          <FieldRow label="CNIC" oldValue={existing.cnic ?? ""} newValue={row.cnic} />
        </div>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve("overwrite")}
            className="flex items-center gap-3 rounded-xl border border-topi-orange-500/40 bg-topi-orange-500/10 px-4 py-3 text-left transition hover:bg-topi-orange-500/20 disabled:opacity-50"
          >
            <Copy size={18} className="shrink-0 text-topi-orange-400" />
            <span>
              <span className="block text-sm font-semibold text-topi-text">Overwrite</span>
              <span className="block text-xs text-topi-muted">
                Uploaded values replace what&apos;s on file. Blank cells won&apos;t erase existing data.
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve("keep_original")}
            className="flex items-center gap-3 rounded-xl border border-topi-border-strong bg-topi-surface px-4 py-3 text-left transition hover:border-topi-faint disabled:opacity-50"
          >
            <ShieldCheck size={18} className="shrink-0 text-topi-muted" />
            <span>
              <span className="block text-sm font-semibold text-topi-text">Keep Original</span>
              <span className="block text-xs text-topi-muted">
                Discard the uploaded row entirely. The existing entry is left untouched.
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve("merge")}
            className="flex items-center gap-3 rounded-xl border border-topi-border-strong bg-topi-surface px-4 py-3 text-left transition hover:border-topi-faint disabled:opacity-50"
          >
            <GitMerge size={18} className="shrink-0 text-topi-muted" />
            <span>
              <span className="block text-sm font-semibold text-topi-text">Merge</span>
              <span className="block text-xs text-topi-muted">
                Keep what&apos;s on file wherever it exists; only use uploaded values to fill blanks.
              </span>
            </span>
          </button>
        </div>

        <div className="mt-5 border-t border-topi-border pt-4">
          <p className="mb-2 text-center text-xs text-topi-faint">
            Or apply one choice to all {total - position + 1} remaining duplicates
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolveAll("overwrite")}
              className="rounded-lg border border-topi-orange-500/40 px-3 py-2 text-xs font-medium text-topi-orange-300 transition hover:bg-topi-orange-500/10 disabled:opacity-50"
            >
              Overwrite all
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolveAll("keep_original")}
              className="rounded-lg border border-topi-border-strong px-3 py-2 text-xs font-medium text-topi-muted transition hover:text-topi-text disabled:opacity-50"
            >
              Keep all
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolveAll("merge")}
              className="rounded-lg border border-topi-border-strong px-3 py-2 text-xs font-medium text-topi-muted transition hover:text-topi-text disabled:opacity-50"
            >
              Merge all
            </button>
          </div>
        </div>

        {busy && <p className="mt-3 text-center text-xs text-topi-faint">Saving…</p>}
      </div>
    </div>
  );
}
