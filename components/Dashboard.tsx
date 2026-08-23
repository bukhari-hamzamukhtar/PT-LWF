"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import FilterBar from "./FilterBar";
import DataTable from "./DataTable";
import ConfirmModal from "./ConfirmModal";
import DuplicateModal from "./DuplicateModal";
import HistoryDrawer from "./HistoryDrawer";
import { useToast } from "./Toast";
import { parseSpreadsheetFile, SpreadsheetParseError } from "@/lib/excel";
import type {
  DuplicateResolution,
  EditableFields,
  Lala,
  SortMode,
  StatusFilter,
  UploadConflict,
} from "@/lib/types";

interface DashboardProps {
  initialLalas: Lala[];
  initialError: string | null;
}

function toDraft(lala: Lala): EditableFields {
  return {
    name: lala.name ?? "",
    phone_number: lala.phone_number ?? "",
    cnic: lala.cnic ?? "",
    help_status: lala.help_status,
    details: lala.details ?? "",
  };
}

export default function Dashboard({ initialLalas, initialError }: DashboardProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [lalas, setLalas] = useState<Lala[]>(initialLalas);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [uploading, setUploading] = useState(false);
  const [duplicateQueue, setDuplicateQueue] = useState<UploadConflict[]>([]);
  const [duplicateIndex, setDuplicateIndex] = useState(0);
  const [resolvingDuplicate, setResolvingDuplicate] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Lala | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);

  const hasShownInitialError = useRef(false);

  useEffect(() => {
    if (initialError && !hasShownInitialError.current) {
      hasShownInitialError.current = true;
      showToast(`Couldn't load the latest data: ${initialError}`, "error");
    }
  }, [initialError, showToast]);

  const refetchLalas = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/lalas");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh data.");
      setLalas(data.lalas);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to refresh data.", "error");
    } finally {
      setRefreshing(false);
    }
  }, [showToast]);

  // ---------- Upload flow ----------

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const rows = await parseSpreadsheetFile(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");

      if (data.insertedCount > 0) {
        showToast(
          `Added ${data.insertedCount} new ${data.insertedCount === 1 ? "entry" : "entries"}.`,
          "success"
        );
        await refetchLalas();
      }

      if (data.conflicts && data.conflicts.length > 0) {
        setDuplicateQueue(data.conflicts);
        setDuplicateIndex(0);
      } else if (data.insertedCount === 0) {
        showToast(
          "No new entries found — everything in this file already matches an existing record.",
          "info"
        );
      }
    } catch (err) {
      if (err instanceof SpreadsheetParseError) {
        showToast(err.message, "error");
      } else {
        showToast(err instanceof Error ? err.message : "Something went wrong while uploading.", "error");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleResolveAllDuplicates(action: DuplicateResolution) {
    if (duplicateQueue.length === 0 || resolvingDuplicate) return;

    setResolvingDuplicate(true);
    try {
      const res = await fetch("/api/upload/resolve-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflicts: duplicateQueue, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve duplicates.");

      setDuplicateQueue([]);
      setDuplicateIndex(0);
      showToast(
        action === "discard" ? "Duplicate rows discarded." : "Duplicates overwritten and merged.",
        "success"
      );
      await refetchLalas();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setResolvingDuplicate(false);
    }
  }

  // ---------- Edit flow ----------

  function handleStartEdit(lala: Lala) {
    setEditingId(lala.id);
    setDraft(toDraft(lala));
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function handleDraftChange<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleRequestConfirmEdit() {
    if (!editingId || !draft) return;
    setSaveConfirmOpen(true);
  }

  async function handleSaveConfirmed() {
    if (!editingId || !draft) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/lalas/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save changes.");

      showToast("Saved.", "success");
      setSaveConfirmOpen(false);
      setEditingId(null);
      setDraft(null);
      await refetchLalas();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save changes.", "error");
      setSaveConfirmOpen(false);
      // editingId / draft intentionally left intact so the person doesn't lose their edits
    } finally {
      setSavingEdit(false);
    }
  }

  // ---------- Delete flow ----------

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/lalas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to move this entry to trash.");

      showToast(`Moved ${deleteTarget.name || "entry"} to trash.`, "success");
      setDeleteTarget(null);
      if (editingId === id) {
        setEditingId(null);
        setDraft(null);
      }
      await refetchLalas();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to move this entry to trash.", "error");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  }

  // ---------- Auth ----------

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  // ---------- Derived data ----------

  const stats = useMemo(() => {
    let helped = 0;
    let pending = 0;
    let notHelped = 0;
    for (const lala of lalas) {
      if (lala.help_status === "Yes") helped++;
      else if (lala.help_status === "Pending") pending++;
      else notHelped++;
    }
    return { total: lalas.length, helped, pending, notHelped };
  }, [lalas]);

  const visibleLalas = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = lalas.filter((lala) => {
      if (statusFilter !== "all" && lala.help_status !== statusFilter) return false;
      if (!query) return true;
      const name = (lala.name ?? "").toLowerCase();
      const cnic = (lala.cnic ?? "").toLowerCase();
      return name.includes(query) || cnic.includes(query);
    });

    result = [...result].sort((a, b) => {
      if (sortMode === "alphabetical") {
        const nameA = (a.name ?? "").trim();
        const nameB = (b.name ?? "").trim();
        if (!nameA && !nameB) return 0;
        if (!nameA) return 1;
        if (!nameB) return -1;
        return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [lalas, search, sortMode, statusFilter]);

  const currentConflict = duplicateQueue[duplicateIndex] ?? null;

  return (
    <div className="min-h-screen bg-topi-void">
      <Header
        total={stats.total}
        helped={stats.helped}
        pending={stats.pending}
        notHelped={stats.notHelped}
        uploading={uploading}
        onUploadFile={handleFileUpload}
        onOpenHistory={() => setHistoryOpen(true)}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-t-2xl border border-topi-border bg-topi-surface shadow-card sm:mx-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            resultCount={visibleLalas.length}
          />

          <div className={refreshing ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
            <DataTable
              lalas={visibleLalas}
              totalActiveCount={lalas.length}
              editingId={editingId}
              draft={draft}
              savingEdit={savingEdit}
              deletingId={deletingId}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onConfirmEdit={handleRequestConfirmEdit}
              onDraftChange={handleDraftChange}
              onRequestDelete={setDeleteTarget}
              onRequestUpload={() => {
                const input = document.querySelector<HTMLInputElement>('input[type="file"]');
                input?.click();
              }}
            />
          </div>
        </div>

        <footer className="px-5 py-8 text-center text-xs text-topi-faint sm:px-8">
          Project Topi · Lalas Welfare Management
        </footer>
      </main>

      <ConfirmModal
        open={saveConfirmOpen}
        title="Save Details?"
        message="These changes will be written to the database and logged in Track Records."
        confirmLabel="Save"
        busy={savingEdit}
        onConfirm={handleSaveConfirmed}
        onCancel={() => setSaveConfirmOpen(false)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title={`Move ${deleteTarget?.name || "this entry"} to trash?`}
        message="You can restore it later from History → Deleted Stuff."
        confirmLabel="Move to Trash"
        destructive
        busy={deletingId !== null}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />

      {currentConflict && (
        <DuplicateModal
          open
          row={currentConflict.row}
          existing={currentConflict.existing}
          matchedOn={currentConflict.matchedOn}
          position={duplicateIndex + 1}
          total={duplicateQueue.length}
          busy={resolvingDuplicate}
          onResolveAll={handleResolveAllDuplicates}
        />
      )}

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onDataChanged={refetchLalas}
      />
    </div>
  );
}
