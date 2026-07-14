import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";

const users = [
  { email: "ada@demo.docsy.app", name: "Ada Lovelace" },
  { email: "grace@demo.docsy.app", name: "Grace Hopper" },
  { email: "alan@demo.docsy.app", name: "Alan Turing" },
];

const welcomeContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Welcome to Docsy" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This is a seeded document. Try " },
        { type: "text", marks: [{ type: "bold" }], text: "bold" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "italic" }], text: "italic" },
        { type: "text", text: " and " },
        { type: "text", marks: [{ type: "underline" }], text: "underline" },
        { type: "text", text: " formatting, headings, and lists." },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Create and rename documents from the dashboard" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Import .txt, .md, or .docx files" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Share documents with other users as viewer or editor" }],
            },
          ],
        },
      ],
    },
  ],
};

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const created = [];
  for (const u of users) {
    created.push(
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash },
      })
    );
  }

  const [ada, grace] = created;

  const existing = await prisma.document.findFirst({
    where: { ownerId: ada.id, title: "Welcome to Docsy" },
  });
  if (!existing) {
    const doc = await prisma.document.create({
      data: {
        title: "Welcome to Docsy",
        content: welcomeContent,
        ownerId: ada.id,
      },
    });
    await prisma.share.create({
      data: { documentId: doc.id, userId: grace.id, role: "EDITOR" },
    });
  }

  console.log("Seeded users (password for all: %s):", DEMO_PASSWORD);
  for (const u of created) console.log("  %s", u.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
