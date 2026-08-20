"use client";

import { Pencil, Check, X, Trash2, UploadCloud, Loader2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { cn, displayValue } from "@/lib/utils";
import { HELP_STATUS_VALUES, type EditableFields, type HelpStatus, type Lala } from "@/lib/types";

interface DataTableProps {
  lalas: Lala[];
  totalActiveCount: number;
  editingId: string | null;
  draft: EditableFields | null;
  savingEdit: boolean;
  deletingId: string | null;
  onStartEdit: (lala: Lala) => void;
  onCancelEdit: () => void;
  onConfirmEdit: () => void;
  onDraftChange: <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void;
  onRequestDelete: (lala: Lala) => void;
  onRequestUpload: () => void;
}

const inputClasses =
  "w-full rounded-md border border-topi-border-strong bg-topi-surface px-2 py-1.5 text-sm text-topi-text focus:border-topi-orange-500 disabled:opacity-60";

export default function DataTable({
  lalas,
  totalActiveCount,
  editingId,
  draft,
  savingEdit,
  deletingId,
  onStartEdit,
  onCancelEdit,
  onConfirmEdit,
  onDraftChange,
  onRequestDelete,
  onRequestUpload,
}: DataTableProps) {
  if (totalActiveCount === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-topi-border-strong bg-topi-surface-2 text-topi-orange-400">
          <UploadCloud size={22} />
        </div>
        <h3 className="mt-5 text-base font-semibold text-topi-text">No Lalas yet</h3>
        <p className="mt-1.5 text-sm text-topi-muted">
          Upload a spreadsheet of names, phone numbers, and CNICs to get started.
        </p>
        <button
          type="button"
          onClick={onRequestUpload}
          className="mt-5 flex items-center gap-2 rounded-xl bg-topi-orange-500 px-4 py-2.5 text-sm font-semibold text-topi-void transition hover:bg-topi-orange-400"
        >
          <UploadCloud size={16} />
          Upload Excel / CSV
        </button>
      </div>
    );
  }

  if (lalas.length === 0) {
    return (
      <div className="px-6 py-20 text-center text-sm text-topi-muted">
        No entries match your search or filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-topi-border text-left text-[11px] font-semibold uppercase tracking-wider text-topi-faint">
            <th className="px-5 py-3 sm:px-8">Name</th>
            <th className="px-3 py-3">Phone Number</th>
            <th className="px-3 py-3">CNIC</th>
            <th className="px-3 py-3">Help Status</th>
            <th className="px-3 py-3">Details</th>
            <th className="px-3 py-3 text-right sm:pr-8">Actions</th>
          </tr>
        </thead>
        <tbody>
          {lalas.map((lala) => {
            const isEditing = editingId === lala.id;
            const isSavingThisRow = isEditing && savingEdit;
            const isDeletingThisRow = deletingId === lala.id;
            return (
              <tr
                key={lala.id}
                className={cn(
                  "border-b border-topi-border/70 transition-colors",
                  isEditing ? "bg-topi-surface-2/60" : "hover:bg-topi-surface-2/40",
                  isDeletingThisRow && "opacity-50"
                )}
              >
                <td className="px-5 py-3 align-top sm:px-8">
                  {isEditing ? (
                    <input
                      className={inputClasses}
                      value={draft?.name ?? ""}
                      disabled={isSavingThisRow}
                      onChange={(e) => onDraftChange("name", e.target.value)}
                      placeholder="Name"
                    />
                  ) : (
                    <span className="font-medium text-topi-text">{displayValue(lala.name)}</span>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {isEditing ? (
                    <input
                      className={cn(inputClasses, "tabular")}
                      value={draft?.phone_number ?? ""}
                      disabled={isSavingThisRow}
                      onChange={(e) => onDraftChange("phone_number", e.target.value)}
                      placeholder="Phone Number"
                    />
                  ) : (
                    <span className="tabular text-topi-muted">{displayValue(lala.phone_number)}</span>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {isEditing ? (
                    <input
                      className={cn(inputClasses, "tabular")}
                      value={draft?.cnic ?? ""}
                      disabled={isSavingThisRow}
                      onChange={(e) => onDraftChange("cnic", e.target.value)}
                      placeholder="CNIC"
                    />
                  ) : (
                    <span className="tabular text-topi-muted">{displayValue(lala.cnic)}</span>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {isEditing ? (
                    <select
                      className={inputClasses}
                      value={draft?.help_status ?? "Pending"}
                      disabled={isSavingThisRow}
                      onChange={(e) => onDraftChange("help_status", e.target.value as HelpStatus)}
                    >
                      {HELP_STATUS_VALUES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={lala.help_status} />
                  )}
                </td>
                <td className="max-w-[220px] px-3 py-3 align-top">
                  {isEditing ? (
                    <input
                      className={inputClasses}
                      value={draft?.details ?? ""}
                      disabled={isSavingThisRow}
                      onChange={(e) => onDraftChange("details", e.target.value)}
                      placeholder="Aid specifics…"
                    />
                  ) : (
                    <span className="block truncate text-topi-muted" title={lala.details ?? undefined}>
                      {displayValue(lala.details)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 align-top sm:pr-8">
                  <div className="flex items-center justify-end gap-1.5">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={onConfirmEdit}
                          disabled={isSavingThisRow}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-topi-orange-500/50 bg-topi-orange-500/10 text-topi-orange-400 transition hover:bg-topi-orange-500/20 disabled:opacity-60"
                          aria-label="Confirm changes"
                          title="Confirm"
                        >
                          {isSavingThisRow ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Check size={15} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={onCancelEdit}
                          disabled={isSavingThisRow}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-topi-border-strong text-topi-muted transition hover:text-topi-text disabled:opacity-60"
                          aria-label="Cancel editing"
                          title="Cancel"
                        >
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onStartEdit(lala)}
                          disabled={isDeletingThisRow}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-topi-border-strong text-topi-muted transition hover:border-topi-faint hover:text-topi-text disabled:opacity-50"
                          aria-label={`Edit ${lala.name ?? "entry"}`}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDelete(lala)}
                          disabled={isDeletingThisRow}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-topi-border-strong text-topi-muted transition hover:border-topi-danger/60 hover:text-topi-danger disabled:opacity-50"
                          aria-label={`Move ${lala.name ?? "entry"} to trash`}
                          title="Move to trash"
                        >
                          {isDeletingThisRow ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
