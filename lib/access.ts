import { prisma } from "./db";

export type Role = "OWNER" | "EDITOR" | "VIEWER";

export interface DocumentAccessInput {
  ownerId: string;
  shares: { userId: string; role: "VIEWER" | "EDITOR" }[];
}

/**
 * Pure access-control decision: given a document's owner and share list,
 * what role does `userId` have? Returns null when the user has no access.
 */
export function resolveRole(doc: DocumentAccessInput, userId: string): Role | null {
  if (doc.ownerId === userId) return "OWNER";
  const share = doc.shares.find((s) => s.userId === userId);
  return share ? share.role : null;
}

export function canView(role: Role | null): boolean {
  return role !== null;
}

export function canEdit(role: Role | null): boolean {
  return role === "OWNER" || role === "EDITOR";
}

/** Only the owner may rename, delete, or manage sharing. */
export function canManage(role: Role | null): boolean {
  return role === "OWNER";
}

/**
 * Loads a document and resolves the caller's role in one query.
 * Returns null when the document does not exist.
 */
export async function getDocumentWithRole(documentId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: { select: { id: true, email: true, name: true } },
      shares: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });
  if (!doc) return null;
  return { doc, role: resolveRole(doc, userId) };
}
