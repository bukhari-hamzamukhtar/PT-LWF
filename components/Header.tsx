"use client";

import { useRef } from "react";
import { UploadCloud, History, LogOut, Loader2 } from "lucide-react";
import { ACCEPTED_FILE_EXTENSIONS } from "@/lib/excel";

interface HeaderProps {
  total: number;
  helped: number;
  pending: number;
  notHelped: number;
  uploading: boolean;
  onUploadFile: (file: File) => void;
  onOpenHistory: () => void;
  onLogout: () => void;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 backdrop-blur-sm ${
        accent
          ? "border-topi-orange-500/40 bg-topi-orange-500/10 shadow-glow-orange"
          : "border-topi-border-strong bg-topi-surface-2/60"
      }`}
    >
      <p className="tabular text-3xl font-bold text-topi-text sm:text-4xl">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-topi-muted">{label}</p>
    </div>
  );
}

export default function Header({
  total,
  helped,
  pending,
  notHelped,
  uploading,
  onUploadFile,
  onOpenHistory,
  onLogout,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = "";
  }

  return (
    <header className="relative overflow-hidden border-b border-topi-border">
      <div className="pointer-events-none absolute inset-0 bg-topi-glow" />
      <div className="pointer-events-none absolute inset-0 bg-topi-grain" />

      <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="animate-rise-in">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-topi-orange-400">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-topi-orange-500" />
              Lalas Welfare System
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold leading-none tracking-tight text-topi-text sm:text-6xl">
              Project <span className="text-topi-orange-500">Topi</span>
            </h1>
            <p className="mt-3 max-w-md stitch-line pt-3 text-sm text-topi-muted">
              Welfare tracking for the Lalas who hold campus running.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 animate-rise-in">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-topi-orange-500 px-4 py-2.5 text-sm font-semibold text-topi-void shadow-glow-orange transition hover:bg-topi-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {uploading ? "Processing…" : "Upload Excel / CSV"}
            </button>
            <button
              type="button"
              onClick={onOpenHistory}
              className="flex items-center gap-2 rounded-xl border border-topi-border-strong bg-topi-surface-2/60 px-4 py-2.5 text-sm font-medium text-topi-text transition hover:border-topi-faint"
            >
              <History size={16} />
              History
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border border-topi-border-strong bg-topi-surface-2/60 px-3 py-2.5 text-sm font-medium text-topi-muted transition hover:border-topi-faint hover:text-topi-text"
              aria-label="Lock app"
              title="Lock app"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 animate-rise-in">
          <StatCard label="Total Lalas" value={total} />
          <StatCard label="Helped" value={helped} accent />
          <StatCard label="Pending" value={pending} />
          <StatCard label="Not Helped" value={notHelped} />
        </div>
      </div>

      <div className="h-24 bg-topi-fade-down" />
    </header>
  );
}
