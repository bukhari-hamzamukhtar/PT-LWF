"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LockScreen({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Incorrect password.");
        setShake(true);
        setPassword("");
        window.setTimeout(() => setShake(false), 450);
        return;
      }

      router.replace(nextPath || "/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-topi-void px-4">
      <div className="pointer-events-none absolute inset-0 bg-topi-glow" />
      <div className="pointer-events-none absolute inset-0 bg-topi-grain" />

      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative w-full max-w-sm rounded-2xl border border-topi-border-strong bg-topi-surface-2/90 p-8 shadow-glow-orange backdrop-blur animate-rise-in",
          shake && "animate-shake"
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-topi-orange-500/40 bg-topi-orange-500/10 text-topi-orange-400 shadow-glow-orange">
            <Lock size={24} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-topi-text">
            Project <span className="text-topi-orange-500">Topi</span>
          </h1>
          <p className="mt-1.5 text-sm text-topi-muted">
            Enter the admin password to manage the Lalas welfare records.
          </p>
        </div>

        <div className="mt-7">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-topi-border-strong bg-topi-surface px-4 py-3 text-center text-sm tracking-wide text-topi-text placeholder:text-topi-faint focus:border-topi-orange-500"
          />

          {error && (
            <p role="alert" className="mt-2.5 text-center text-sm text-topi-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-topi-orange-500 px-4 py-3 text-sm font-semibold text-topi-void transition hover:bg-topi-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Unlock <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
