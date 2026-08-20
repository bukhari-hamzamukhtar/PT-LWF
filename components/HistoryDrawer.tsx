"use client";

import { useCallback, useEffect, useState } from "react";
import { X, PenLine, PlusCircle, Trash2, RotateCcw, Inbox, Loader2 } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toast";
import { cn, displayValue, formatRelative } from "@/lib/utils";
import type { HistoryLog, Lala } from "@/lib/types";

type Tab = "track" | "added" | "trash";

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

const TABS: { id: Tab; label: string; icon: typeof PenLine }[] = [
  { id: "track", label: "Track Records", icon: PenLine },
  { id: "added", label: "Added Stuff", icon: PlusCircle },
  { id: "trash", label: "Deleted Stuff", icon: Trash2 },
];

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  phone_number: "Phone Number",
  cnic: "CNIC",
  help_status: "Help Status",
  details: "Details",
};

export default function HistoryDrawer({ open, onClose, onDataChanged }: HistoryDrawerProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("track");
  const [trackRecords, setTrackRecords] = useState<HistoryLog[] | null>(null);
  const [addedStuff, setAddedStuff] = useState<HistoryLog[] | null>(null);
  const [trash, setTrash] = useState<Lala[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: "restore" | "permanent-delete"; lala: Lala }
    | null
  >(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTab = useCallback(async (tab: Tab) => {
    setLoading(true);
    try {
      if (tab === "track") {
        const res = await fetch("/api/history?type=update");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load track records.");
        setTrackRecords(data.logs);
      } else if (tab === "added") {
        const res = await fetch("/api/history?type=create");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load added history.");
        setAddedStuff(data.logs);
      } else {
        const res = await fetch("/api/trash");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load trash.");
        setTrash(data.lalas);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!open) return;
    // Intentional: loadTab sets a loading flag and fetches whenever the
    // drawer opens or the active tab changes. This is a standard
    // fetch-on-dependency-change effect; the setState inside loadTab is
    // exactly what should happen here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTab(activeTab);
  }, [open, activeTab, loadTab]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function handleRestore(lala: Lala) {
    setBusyId(lala.id);
    try {
      const res = await fetch(`/api/trash/${lala.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore this entry.");
      showToast(`Restored ${lala.name || "entry"}.`, "success");
      setTrash((prev) => (prev ? prev.filter((item) => item.id !== lala.id) : prev));
      onDataChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusyId(null);
      setPendingAction(null);
    }
  }

  async function handlePermanentDelete(lala: Lala) {
    setBusyId(lala.id);
    try {
      const res = await fetch(`/api/trash/${lala.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to permanently delete this entry.");
      showToast(`Permanently deleted ${lala.name || "entry"}.`, "success");
      setTrash((prev) => (prev ? prev.filter((item) => item.id !== lala.id) : prev));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setBusyId(null);
      setPendingAction(null);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[80] flex justify-end bg-black/70 animate-fade-in" onClick={onClose}>
        <div
          className="flex h-full w-full max-w-lg flex-col border-l border-topi-border-strong bg-topi-surface-2 shadow-2xl animate-rise-in"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="History"
        >
          <div className="flex items-center justify-between border-b border-topi-border px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-topi-text">History</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-topi-muted hover:text-topi-text"
              aria-label="Close history"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-1 border-b border-topi-border px-3 pt-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-medium transition",
                    activeTab === tab.id
                      ? "border-topi-orange-500 text-topi-orange-300"
                      : "border-transparent text-topi-muted hover:text-topi-text"
                  )}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading && (
              <div className="flex items-center justify-center py-16 text-topi-faint">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}

            {!loading && activeTab === "track" && (
              <TrackRecordsList records={trackRecords} />
            )}

            {!loading && activeTab === "added" && <AddedStuffList records={addedStuff} />}

            {!loading && activeTab === "trash" && (
              <TrashList
                items={trash}
                busyId={busyId}
                onRestore={(lala) => setPendingAction({ type: "restore", lala })}
                onPermanentDelete={(lala) => setPendingAction({ type: "permanent-delete", lala })}
              />
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={pendingAction !== null}
        title={
          pendingAction?.type === "restore"
            ? `Restore ${pendingAction.lala.name || "this entry"}?`
            : `Permanently delete ${pendingAction?.lala.name || "this entry"}?`
        }
        message={
          pendingAction?.type === "restore"
            ? "This entry will reappear in the main table."
            : "This cannot be undone. The entry will be permanently removed."
        }
        confirmLabel={pendingAction?.type === "restore" ? "Restore" : "Delete Permanently"}
        destructive={pendingAction?.type === "permanent-delete"}
        busy={busyId !== null}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          if (pendingAction.type === "restore") handleRestore(pendingAction.lala);
          else handlePermanentDelete(pendingAction.lala);
        }}
      />
    </>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Inbox; text: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <Icon size={28} className="text-topi-faint" />
      <p className="mt-3 text-sm text-topi-muted">{text}</p>
    </div>
  );
}

function TrackRecordsList({ records }: { records: HistoryLog[] | null }) {
  if (!records || records.length === 0) {
    return <EmptyState icon={PenLine} text="No edits have been recorded yet." />;
  }
  return (
    <ul className="space-y-2.5">
      {records.map((log) => (
        <li key={log.id} className="rounded-xl border border-topi-border bg-topi-surface px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-topi-text">{displayValue(log.lala_name)}</span>
            <span className="whitespace-nowrap text-xs text-topi-faint">{formatRelative(log.created_at)}</span>
          </div>
          <p className="mt-1 text-xs text-topi-muted">
            {FIELD_LABELS[log.field_changed ?? ""] ?? log.field_changed ?? "Field"} changed from{" "}
            <span className="text-topi-text">{displayValue(log.old_value)}</span> to{" "}
            <span className="text-topi-orange-300">{displayValue(log.new_value)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function AddedStuffList({ records }: { records: HistoryLog[] | null }) {
  if (!records || records.length === 0) {
    return <EmptyState icon={PlusCircle} text="No uploads have been recorded yet." />;
  }
  return (
    <ul className="space-y-2.5">
      {records.map((log) => (
        <li key={log.id} className="rounded-xl border border-topi-border bg-topi-surface px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-topi-text">{displayValue(log.lala_name)}</span>
            <span className="whitespace-nowrap text-xs text-topi-faint">{formatRelative(log.created_at)}</span>
          </div>
          {log.details && <p className="mt-1 text-xs text-topi-muted">{log.details}</p>}
        </li>
      ))}
    </ul>
  );
}

function TrashList({
  items,
  busyId,
  onRestore,
  onPermanentDelete,
}: {
  items: Lala[] | null;
  busyId: string | null;
  onRestore: (lala: Lala) => void;
  onPermanentDelete: (lala: Lala) => void;
}) {
  if (!items || items.length === 0) {
    return <EmptyState icon={Trash2} text="Trash is empty." />;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((lala) => (
        <li
          key={lala.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-topi-border bg-topi-surface px-4 py-3 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-topi-text">{displayValue(lala.name)}</p>
            <p className="truncate text-xs text-topi-faint">
              {displayValue(lala.cnic)} · deleted {formatRelative(lala.deleted_at)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={busyId === lala.id}
              onClick={() => onRestore(lala)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-topi-border-strong text-topi-muted transition hover:border-topi-orange-500/50 hover:text-topi-orange-300 disabled:opacity-50"
              aria-label={`Restore ${lala.name ?? "entry"}`}
              title="Restore"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              disabled={busyId === lala.id}
              onClick={() => onPermanentDelete(lala)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-topi-border-strong text-topi-muted transition hover:border-topi-danger/60 hover:text-topi-danger disabled:opacity-50"
              aria-label={`Permanently delete ${lala.name ?? "entry"}`}
              title="Delete permanently"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
