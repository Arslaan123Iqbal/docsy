import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { listDocumentsFor } from "@/lib/documents";
import { requireUser, withErrorHandling } from "@/lib/api";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

/** Lists documents the user owns and documents shared with them. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json(await listDocumentsFor(user.id));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const body = createSchema.parse(await req.json().catch(() => ({})));

  const doc = await prisma.document.create({
    data: { title: body.title ?? "Untitled document", ownerId: user.id },
    select: { id: true, title: true },
  });
  return NextResponse.json(doc, { status: 201 });
});
