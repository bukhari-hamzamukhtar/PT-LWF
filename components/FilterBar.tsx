"use client";

import { Search, ArrowDownAZ, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortMode, StatusFilter } from "@/lib/types";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  resultCount: number;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Yes", label: "Helped" },
  { value: "Pending", label: "Pending" },
  { value: "No", label: "Not Helped" },
];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-topi-orange-500/60 bg-topi-orange-500/15 text-topi-orange-300"
          : "border-topi-border-strong text-topi-muted hover:border-topi-faint hover:text-topi-text"
      )}
    >
      {children}
    </button>
  );
}

export default function FilterBar({
  search,
  onSearchChange,
  sortMode,
  onSortModeChange,
  statusFilter,
  onStatusFilterChange,
  resultCount,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-topi-border bg-topi-surface/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="relative w-full sm:max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-topi-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or CNIC…"
          className="w-full rounded-lg border border-topi-border-strong bg-topi-surface-2 py-2 pl-9 pr-8 text-sm text-topi-text placeholder:text-topi-faint focus:border-topi-orange-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-topi-faint hover:text-topi-text"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-topi-border-strong p-1">
          <Pill active={sortMode === "recent"} onClick={() => onSortModeChange("recent")}>
            <span className="flex items-center gap-1">
              <Clock size={12} /> Recent
            </span>
          </Pill>
          <Pill active={sortMode === "alphabetical"} onClick={() => onSortModeChange("alphabetical")}>
            <span className="flex items-center gap-1">
              <ArrowDownAZ size={12} /> Alphabetical
            </span>
          </Pill>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_OPTIONS.map((option) => (
            <Pill
              key={option.value}
              active={statusFilter === option.value}
              onClick={() => onStatusFilterChange(option.value)}
            >
              {option.label}
            </Pill>
          ))}
        </div>

        <span className="ml-1 whitespace-nowrap text-xs text-topi-faint">
          {resultCount} {resultCount === 1 ? "entry" : "entries"}
        </span>
      </div>
    </div>
  );
}
