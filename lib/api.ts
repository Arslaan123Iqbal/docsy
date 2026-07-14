import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "./session";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Throws a 401 HttpError when no valid session exists. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Not authenticated");
  return user;
}

/**
 * Wraps a route handler with uniform error handling: HttpError and
 * ZodError become clean JSON responses; anything else is a logged 500.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.message, err.status);
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return jsonError(first ? `${first.path.join(".")}: ${first.message}` : "Invalid input", 400);
      }
      console.error(err);
      return jsonError("Internal server error", 500);
    }
  };
}
