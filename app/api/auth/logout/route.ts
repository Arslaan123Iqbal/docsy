import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";
import { withErrorHandling } from "@/lib/api";

export const POST = withErrorHandling(async () => {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
