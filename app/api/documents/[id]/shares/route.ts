import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, withErrorHandling, jsonError } from "@/lib/api";
import { getDocumentWithRole, canManage } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

const shareSchema = z.object({
  email: z.string().email(),
  role: z.enum(["VIEWER", "EDITOR"]).default("EDITOR"),
});

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;

  const result = await getDocumentWithRole(id, user.id);
  if (!result || !result.role) return jsonError("Document not found", 404);
  if (!canManage(result.role)) return jsonError("Only the owner can view sharing settings", 403);

  return NextResponse.json({
    shares: result.doc.shares.map((s) => ({
      id: s.id,
      role: s.role,
      user: s.user,
    })),
  });
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { email, role } = shareSchema.parse(await req.json());

  const result = await getDocumentWithRole(id, user.id);
  if (!result || !result.role) return jsonError("Document not found", 404);
  if (!canManage(result.role)) return jsonError("Only the owner can share this document", 403);

  const target = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!target) return jsonError("No user found with that email", 404);
  if (target.id === user.id) return jsonError("You already own this document", 400);

  const share = await prisma.share.upsert({
    where: { documentId_userId: { documentId: id, userId: target.id } },
    update: { role },
    create: { documentId: id, userId: target.id, role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  return NextResponse.json(
    { id: share.id, role: share.role, user: share.user },
    { status: 201 }
  );
});
