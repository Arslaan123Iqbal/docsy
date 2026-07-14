import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, withErrorHandling, jsonError } from "@/lib/api";
import { getDocumentWithRole, canManage } from "@/lib/access";

type Ctx = { params: Promise<{ id: string; shareId: string }> };

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const { id, shareId } = await params;

  const result = await getDocumentWithRole(id, user.id);
  if (!result || !result.role) return jsonError("Document not found", 404);
  if (!canManage(result.role)) return jsonError("Only the owner can manage sharing", 403);

  const share = result.doc.shares.find((s) => s.id === shareId);
  if (!share) return jsonError("Share not found", 404);

  await prisma.share.delete({ where: { id: shareId } });
  return NextResponse.json({ ok: true });
});
