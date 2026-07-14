import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listDocumentsFor } from "@/lib/documents";
import Dashboard from "@/components/Dashboard";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { owned, shared } = await listDocumentsFor(user.id);

  return (
    <Dashboard
      user={user}
      owned={owned.map(serializeDates)}
      shared={shared.map(serializeDates)}
    />
  );
}

function serializeDates<T extends { updatedAt: Date }>(doc: T) {
  return { ...doc, updatedAt: doc.updatedAt.toISOString() };
}
