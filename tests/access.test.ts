import { describe, it, expect } from "vitest";
import { resolveRole, canView, canEdit, canManage } from "@/lib/access";

const doc = {
  ownerId: "owner-1",
  shares: [
    { userId: "editor-1", role: "EDITOR" as const },
    { userId: "viewer-1", role: "VIEWER" as const },
  ],
};

describe("resolveRole", () => {
  it("gives the owner the OWNER role", () => {
    expect(resolveRole(doc, "owner-1")).toBe("OWNER");
  });

  it("resolves share roles for shared users", () => {
    expect(resolveRole(doc, "editor-1")).toBe("EDITOR");
    expect(resolveRole(doc, "viewer-1")).toBe("VIEWER");
  });

  it("returns null for users with no access", () => {
    expect(resolveRole(doc, "stranger")).toBeNull();
  });

  it("owner wins even if the owner also appears in shares", () => {
    const weird = { ownerId: "u1", shares: [{ userId: "u1", role: "VIEWER" as const }] };
    expect(resolveRole(weird, "u1")).toBe("OWNER");
  });
});

describe("permission checks", () => {
  it("view: any role can view, no role cannot", () => {
    expect(canView("OWNER")).toBe(true);
    expect(canView("EDITOR")).toBe(true);
    expect(canView("VIEWER")).toBe(true);
    expect(canView(null)).toBe(false);
  });

  it("edit: owner and editor only", () => {
    expect(canEdit("OWNER")).toBe(true);
    expect(canEdit("EDITOR")).toBe(true);
    expect(canEdit("VIEWER")).toBe(false);
    expect(canEdit(null)).toBe(false);
  });

  it("manage (rename/delete/share): owner only", () => {
    expect(canManage("OWNER")).toBe(true);
    expect(canManage("EDITOR")).toBe(false);
    expect(canManage("VIEWER")).toBe(false);
    expect(canManage(null)).toBe(false);
  });
});
