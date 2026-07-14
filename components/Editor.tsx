"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent, useEditorState, type Editor as TiptapEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import type { SessionUser } from "./Header";
import ShareDialog, { type ShareEntry } from "./ShareDialog";

type Role = "OWNER" | "EDITOR" | "VIEWER";
type SaveState = "loading" | "saved" | "saving" | "error" | "readonly";

interface DocData {
  id: string;
  title: string;
  content: object | null;
  owner: { id: string; email: string; name: string };
  role: Role;
}

const SAVE_DEBOUNCE_MS = 800;

export default function Editor({
  documentId,
  user,
}: {
  documentId: string;
  user: SessionUser;
}) {
  const [doc, setDoc] = useState<DocData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [shareState, setShareState] = useState<{ open: boolean; shares: ShareEntry[] }>({
    open: false,
    shares: [],
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canEdit = doc?.role === "OWNER" || doc?.role === "EDITOR";
  const isOwner = doc?.role === "OWNER";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    editorProps: {
      attributes: { class: "doc-content min-h-[60vh]" },
    },
    immediatelyRender: false,
    editable: false,
  });

  const persistContent = useCallback(
    async (json: object) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: json }),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    },
    [documentId]
  );

  // Load document once the editor instance exists.
  useEffect(() => {
    if (!editor) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (cancelled) return;
        if (!res.ok) {
          setNotFound(true);
          setSaveState("error");
          return;
        }
        const data: DocData = await res.json();
        setDoc(data);
        setTitle(data.title);
        if (data.content) editor.commands.setContent(data.content);
        const editable = data.role === "OWNER" || data.role === "EDITOR";
        editor.setEditable(editable);
        setSaveState(editable ? "saved" : "readonly");
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setSaveState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editor, documentId]);

  // Debounced autosave on content changes.
  useEffect(() => {
    if (!editor || !canEdit) return;

    const onUpdate = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState("saving");
      saveTimer.current = setTimeout(() => {
        persistContent(editor.getJSON());
      }, SAVE_DEBOUNCE_MS);
    };

    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [editor, canEdit, persistContent]);

  async function openShareDialog() {
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`);
      const data = res.ok ? await res.json() : { shares: [] };
      setShareState({ open: true, shares: data.shares });
    } catch {
      setShareState({ open: true, shares: [] });
    }
  }

  async function saveTitle(newTitle: string) {
    const trimmed = newTitle.trim();
    if (!doc || trimmed === doc.title || trimmed.length === 0) {
      setTitle(doc?.title ?? "");
      return;
    }
    const res = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (res.ok) {
      setDoc((d) => (d ? { ...d, title: trimmed } : d));
    } else {
      setTitle(doc.title);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold">Document not found</h1>
        <p className="text-neutral-500 text-sm">
          It may have been deleted, or you may not have access.
        </p>
        <Link
          href="/"
          className="bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-neutral-700 transition-colors"
        >
          Back to documents
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-3">
          <Link
            href="/"
            className="text-neutral-500 hover:text-neutral-900 text-sm shrink-0 transition-colors"
            title="Back to documents"
          >
            ← Docs
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => saveTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            disabled={!isOwner}
            aria-label="Document title"
            className="flex-1 min-w-0 font-semibold text-lg bg-transparent rounded-lg px-2 py-1 border border-transparent hover:border-neutral-200 focus:border-neutral-300 focus:outline-none disabled:hover:border-transparent"
            title={isOwner ? "Rename document" : "Only the owner can rename"}
          />
          <SaveIndicator state={saveState} />
          {isOwner && (
            <button
              onClick={openShareDialog}
              className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-blue-500 shrink-0 transition-colors"
            >
              Share
            </button>
          )}
          {doc && !isOwner && (
            <span className="text-xs bg-neutral-100 text-neutral-600 rounded-full px-2.5 py-1 shrink-0">
              {doc.role === "EDITOR" ? "Can edit" : "View only"} · by {doc.owner.name}
            </span>
          )}
        </div>
        {canEdit && editor && <Toolbar editor={editor} />}
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm px-8 py-6 sm:px-12 sm:py-10 min-h-[70vh]">
          <EditorContent editor={editor} />
        </div>
      </main>

      {shareState.open && doc && (
        <ShareDialog
          documentId={doc.id}
          currentUser={user}
          initialShares={shareState.shares}
          onClose={() => setShareState({ open: false, shares: [] })}
        />
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const label: Record<SaveState, string> = {
    loading: "Loading…",
    saving: "Saving…",
    saved: "Saved",
    error: "Save failed — retrying on next edit",
    readonly: "Read-only",
  };
  const color =
    state === "error"
      ? "text-red-600"
      : state === "saved"
        ? "text-green-600"
        : "text-neutral-400";
  return <span className={`text-xs shrink-0 ${color}`}>{label[state]}</span>;
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor.isActive("bold"),
      italic: ctx.editor.isActive("italic"),
      underline: ctx.editor.isActive("underline"),
      strike: ctx.editor.isActive("strike"),
      h1: ctx.editor.isActive("heading", { level: 1 }),
      h2: ctx.editor.isActive("heading", { level: 2 }),
      h3: ctx.editor.isActive("heading", { level: 3 }),
      bulletList: ctx.editor.isActive("bulletList"),
      orderedList: ctx.editor.isActive("orderedList"),
      canUndo: ctx.editor.can().undo(),
      canRedo: ctx.editor.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <div className="max-w-4xl mx-auto px-4 pb-2 flex flex-wrap items-center gap-1">
      <ToolbarButton
        label="B"
        title="Bold (⌘B)"
        active={state.bold}
        onClick={() => chain().toggleBold().run()}
        className="font-bold"
      />
      <ToolbarButton
        label="I"
        title="Italic (⌘I)"
        active={state.italic}
        onClick={() => chain().toggleItalic().run()}
        className="italic"
      />
      <ToolbarButton
        label="U"
        title="Underline (⌘U)"
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
        className="underline"
      />
      <ToolbarButton
        label="S"
        title="Strikethrough"
        active={state.strike}
        onClick={() => chain().toggleStrike().run()}
        className="line-through"
      />
      <Divider />
      <ToolbarButton
        label="H1"
        title="Heading 1"
        active={state.h1}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        label="H2"
        title="Heading 2"
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="H3"
        title="Heading 3"
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      />
      <Divider />
      <ToolbarButton
        label="• List"
        title="Bulleted list"
        active={state.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      />
      <ToolbarButton
        label="1. List"
        title="Numbered list"
        active={state.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      />
      <Divider />
      <ToolbarButton
        label="↺"
        title="Undo (⌘Z)"
        disabled={!state.canUndo}
        onClick={() => chain().undo().run()}
      />
      <ToolbarButton
        label="↻"
        title="Redo (⌘⇧Z)"
        disabled={!state.canRedo}
        onClick={() => chain().redo().run()}
      />
    </div>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-neutral-200 mx-1" aria-hidden />;
}

function ToolbarButton({
  label,
  title,
  onClick,
  active = false,
  disabled = false,
  className = "",
}: {
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`text-sm rounded-md px-2.5 py-1 transition-colors disabled:opacity-30 ${
        active ? "bg-neutral-900 text-white" : "hover:bg-neutral-100 text-neutral-700"
      } ${className}`}
    >
      {label}
    </button>
  );
}
