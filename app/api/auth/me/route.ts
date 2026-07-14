import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json(user);
});
