"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_USERS = [
  { email: "ada@demo.docsy.app", name: "Ada Lovelace" },
  { email: "grace@demo.docsy.app", name: "Grace Hopper" },
  { email: "alan@demo.docsy.app", name: "Alan Turing" },
];

const DEMO_PASSWORD = "demo1234";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login(loginEmail: string, loginPassword: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Login failed");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Docsy</h1>
          <p className="text-neutral-500 mt-1">Lightweight collaborative documents</p>
        </div>

        <form
          className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            login(email, password);
          }}
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-neutral-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-wide text-neutral-400 text-center mb-3">
            Demo accounts (password: {DEMO_PASSWORD})
          </p>
          <div className="grid gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                disabled={busy}
                onClick={() => login(u.email, DEMO_PASSWORD)}
                className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm text-left hover:border-neutral-400 disabled:opacity-50 transition-colors"
              >
                <span className="font-medium">{u.name}</span>{" "}
                <span className="text-neutral-500">— {u.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
