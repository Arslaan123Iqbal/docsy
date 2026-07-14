"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "./Header";

export interface ShareEntry {
  id: string;
  role: "VIEWER" | "EDITOR";
  user: { id: string; email: string; name: string };
}

export default function ShareDialog({
  documentId,
  currentUser,
  initialShares,
  onClose,
}: {
  documentId: string;
  currentUser: SessionUser;
  initialShares: ShareEntry[];
  onClose: () => void;
}) {
  const [shares, setShares] = useState(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"VIEWER" | "EDITOR">("EDITOR");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addShare(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not share document.");
        return;
      }
      // Upsert semantics: sharing again with the same user updates their role.
      setShares((s) => [...s.filter((x) => x.user.id !== data.user.id), data]);
      setEmail("");
    } catch {
      setError("Could not share document.");
    } finally {
      setBusy(false);
    }
  }

  async function removeShare(shareId: string) {
    const res = await fetch(`/api/documents/${documentId}/shares/${shareId}`, {
      method: "DELETE",
    });
    if (res.ok) setShares((s) => s.filter((x) => x.id !== shareId));
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share document"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Share document</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={addShare} className="flex gap-2 mb-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
            className="flex-1 min-w-0 border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "VIEWER" | "EDITOR")}
            className="border border-neutral-300 rounded-lg px-2 py-2 text-sm bg-white"
            aria-label="Access level"
          >
            <option value="EDITOR">Can edit</option>
            <option value="VIEWER">Can view</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            Share
          </button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            People with access
          </h3>
          <ul className="space-y-2">
            <li className="flex items-center justify-between text-sm">
              <span>
                <span className="font-medium">{currentUser.name}</span>{" "}
                <span className="text-neutral-500">({currentUser.email})</span>
              </span>
              <span className="text-xs text-neutral-500">Owner</span>
            </li>
            {shares.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm gap-2">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{s.user.name}</span>{" "}
                  <span className="text-neutral-500">({s.user.email})</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-neutral-500">
                    {s.role === "EDITOR" ? "Can edit" : "Can view"}
                  </span>
                  <button
                    onClick={() => removeShare(s.id)}
                    className="text-xs text-neutral-400 hover:text-red-600 transition-colors"
                    title="Remove access"
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
            {shares.length === 0 && (
              <li className="text-sm text-neutral-500">Not shared with anyone yet.</li>
            )}
          </ul>
        </div>

        <p className="text-xs text-neutral-400 mt-4">
          Tip: demo users are ada@, grace@ and alan@demo.docsy.app
        </p>
      </div>
    </div>
  );
}
