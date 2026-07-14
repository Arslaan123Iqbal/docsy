"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header, { SessionUser } from "./Header";

export interface DocListItem {
  id: string;
  title: string;
  updatedAt: string;
  owner: { id: string; email: string; name: string };
  role?: "VIEWER" | "EDITOR";
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export default function Dashboard({
  user,
  owned: initialOwned,
  shared,
}: {
  user: SessionUser;
  owned: DocListItem[];
  shared: DocListItem[];
}) {
  const router = useRouter();
  const [owned, setOwned] = useState(initialOwned);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function createDocument() {
    setBusy(true);
    try {
      const res = await fetch("/api/documents", { method: "POST" });
      if (!res.ok) throw new Error();
      const doc = await res.json();
      router.push(`/doc/${doc.id}`);
    } catch {
      setError("Could not create document.");
      setBusy(false);
    }
  }

  async function uploadFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Upload failed.");
        return;
      }
      router.push(`/doc/${data.id}`);
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDocument(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOwned((docs) => docs.filter((d) => d.id !== id));
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not delete document.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Your documents</h1>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="border border-neutral-300 bg-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 transition-colors"
            >
              Import file
            </button>
            <button
              onClick={createDocument}
              disabled={busy}
              className="bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              + New document
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <p className="text-xs text-neutral-500 mb-6">
          Import supports .txt, .md and .docx (max 2 MB).
        </p>

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-6">
            {error}
          </p>
        )}

        <div className="space-y-10">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
              Owned by you
            </h2>
            {owned.length === 0 ? (
              <p className="text-neutral-500 text-sm bg-white border border-dashed border-neutral-300 rounded-xl p-6 text-center">
                No documents yet. Create one or import a file to get started.
              </p>
            ) : (
              <ul className="grid gap-2">
                {owned.map((doc) => (
                  <li
                    key={doc.id}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-neutral-400 transition-colors"
                  >
                    <button
                      onClick={() => router.push(`/doc/${doc.id}`)}
                      className="text-left flex-1 min-w-0"
                    >
                      <span className="font-medium block truncate">{doc.title}</span>
                      <span className="text-xs text-neutral-500" suppressHydrationWarning>
                        Edited {timeAgo(doc.updatedAt)}
                      </span>
                    </button>
                    <button
                      onClick={() => deleteDocument(doc.id, doc.title)}
                      className="text-xs text-neutral-400 hover:text-red-600 border border-transparent hover:border-red-200 rounded-lg px-2 py-1 transition-colors"
                      title="Delete document"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-3">
              Shared with you
            </h2>
            {shared.length === 0 ? (
              <p className="text-neutral-500 text-sm bg-white border border-dashed border-neutral-300 rounded-xl p-6 text-center">
                Nothing shared with you yet.
              </p>
            ) : (
              <ul className="grid gap-2">
                {shared.map((doc) => (
                  <li
                    key={doc.id}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:border-neutral-400 transition-colors"
                  >
                    <button
                      onClick={() => router.push(`/doc/${doc.id}`)}
                      className="text-left flex-1 min-w-0"
                    >
                      <span className="font-medium block truncate">{doc.title}</span>
                      <span className="text-xs text-neutral-500" suppressHydrationWarning>
                        By {doc.owner.name} · Edited {timeAgo(doc.updatedAt)}
                      </span>
                    </button>
                    <span
                      className={`text-xs rounded-full px-2.5 py-1 font-medium ${
                        doc.role === "EDITOR"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {doc.role === "EDITOR" ? "Can edit" : "View only"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
