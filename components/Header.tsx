"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export default function Header({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Docsy
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-600 hidden sm:inline" title={user.email}>
            {user.name}
          </span>
          <button
            onClick={logout}
            className="border border-neutral-300 rounded-lg px-3 py-1.5 hover:bg-neutral-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
