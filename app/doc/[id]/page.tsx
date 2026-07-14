import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Editor from "@/components/Editor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <Editor documentId={id} user={user} />;
}
