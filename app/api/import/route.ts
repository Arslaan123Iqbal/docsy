import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@tiptap/html/server";
import { StarterKit } from "@tiptap/starter-kit";
import { prisma } from "@/lib/db";
import { requireUser, withErrorHandling, jsonError } from "@/lib/api";
import { fileToHtml, titleFromFilename, MAX_UPLOAD_BYTES } from "@/lib/import";
import type { Prisma } from "@prisma/client";

/**
 * Accepts a multipart upload (.txt, .md, .docx) and creates a new
 * editable document from its contents, owned by the caller.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError("No file provided. Send multipart/form-data with a 'file' field.", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError("File is too large (max 2 MB).", 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let html: string;
  try {
    html = await fileToHtml(file.name, buffer);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not read file", 400);
  }

  const content = generateJSON(html, [StarterKit]) as Prisma.InputJsonValue;

  const doc = await prisma.document.create({
    data: {
      title: titleFromFilename(file.name),
      content,
      ownerId: user.id,
    },
    select: { id: true, title: true },
  });

  return NextResponse.json(doc, { status: 201 });
});
