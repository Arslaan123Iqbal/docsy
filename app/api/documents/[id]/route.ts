import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, withErrorHandling, jsonError } from "@/lib/api";
import { getDocumentWithRole, canEdit, canManage } from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    // TipTap document JSON; validated structurally at the top level only
    content: z.object({ type: z.literal("doc") }).passthrough().optional(),
  })
  .refine((b) => b.title !== undefined || b.content !== undefined, {
    message: "Nothing to update",
  });

export const GET = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;

  const result = await getDocumentWithRole(id, user.id);
  if (!result || !result.role) return jsonError("Document not found", 404);

  const { doc, role } = result;
  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    updatedAt: doc.updatedAt,
    owner: doc.owner,
    role,
  });
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const body = patchSchema.parse(await req.json());

  const result = await getDocumentWithRole(id, user.id);
  if (!result || !result.role) return jsonError("Document not found", 404);

  if (body.title !== undefined && !canManage(result.role)) {
    return jsonError("Only the owner can rename this document", 403);
  }
  if (body.content !== undefined && !canEdit(result.role)) {
    return jsonError("You have view-only access to this document", 403);
  }

  const doc = await prisma.document.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined
        ? { content: body.content as Prisma.InputJsonValue }
        : {}),
    },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json(doc);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;

  const result = await getDocumentWithRole(id, user.id);
  if (!result || !result.role) return jsonError("Document not found", 404);
  if (!canManage(result.role)) return jsonError("Only the owner can delete this document", 403);

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
