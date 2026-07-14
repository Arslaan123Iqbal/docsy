import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  detectExtension,
  textToHtml,
  markdownToHtml,
  titleFromFilename,
  fileToHtml,
  MAX_UPLOAD_BYTES,
} from "@/lib/import";

describe("detectExtension", () => {
  it("detects supported extensions case-insensitively", () => {
    expect(detectExtension("notes.txt")).toBe(".txt");
    expect(detectExtension("README.MD")).toBe(".md");
    expect(detectExtension("report.DOCX")).toBe(".docx");
  });

  it("rejects unsupported extensions", () => {
    expect(detectExtension("image.png")).toBeNull();
    expect(detectExtension("archive.docx.zip")).toBeNull();
    expect(detectExtension("noextension")).toBeNull();
  });
});

describe("textToHtml", () => {
  it("splits blank-line-separated blocks into paragraphs", () => {
    expect(textToHtml("one\n\ntwo")).toBe("<p>one</p><p>two</p>");
  });

  it("keeps single newlines as line breaks within a paragraph", () => {
    expect(textToHtml("line one\nline two")).toBe("<p>line one<br>line two</p>");
  });

  it("escapes HTML so uploaded text cannot inject markup", () => {
    expect(textToHtml('<script>alert("x")</script>')).toBe(
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>"
    );
  });

  it("handles Windows line endings", () => {
    expect(textToHtml("a\r\n\r\nb")).toBe("<p>a</p><p>b</p>");
  });
});

describe("markdownToHtml", () => {
  it("converts headings, emphasis and lists", () => {
    const html = markdownToHtml("# Title\n\n**bold** *it*\n\n- a\n- b");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>it</em>");
    expect(html).toContain("<li>a</li>");
  });
});

describe("titleFromFilename", () => {
  it("strips the extension", () => {
    expect(titleFromFilename("Q3 plan.docx")).toBe("Q3 plan");
  });

  it("falls back for empty basenames", () => {
    expect(titleFromFilename(".txt")).toBe("Imported document");
  });
});

describe("fileToHtml", () => {
  it("converts a real .docx fixture", async () => {
    const buf = readFileSync(path.join(__dirname, "fixtures/sample.docx"));
    const html = await fileToHtml("sample.docx", buf);
    expect(html).toContain("Hello from a Word file");
  });

  it("rejects oversized files", async () => {
    const big = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
    await expect(fileToHtml("big.txt", big)).rejects.toThrow(/too large/);
  });

  it("rejects unsupported types with a clear message", async () => {
    await expect(fileToHtml("x.pdf", Buffer.from("x"))).rejects.toThrow(/Unsupported/);
  });
});
