import { prisma } from "./db";

const listSelect = {
  id: true,
  title: true,
  updatedAt: true,
  owner: { select: { id: true, email: true, name: true } },
} as const;

/** Documents the user owns plus documents shared with them, newest first. */
export async function listDocumentsFor(userId: string) {
  const [owned, sharedShares] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      select: listSelect,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.share.findMany({
      where: { userId },
      select: { role: true, document: { select: listSelect } },
      orderBy: { document: { updatedAt: "desc" } },
    }),
  ]);

  return {
    owned,
    shared: sharedShares.map((s) => ({ ...s.document, role: s.role })),
  };
}
