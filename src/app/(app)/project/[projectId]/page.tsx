"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { ProjectFile, ConversationSummary } from "@/types";

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  conversations: ConversationSummary[];
  files: ProjectFile[];
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [projectId, setProjectId] = useState<string>("");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notesTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    params.then((p) => setProjectId(p.projectId));
  }, [params]);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
      setName(data.name);
      setDescription(data.description || "");
      setNotes(data.notes || "");
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  async function saveDetails() {
    setSaving(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setSaving(false);
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(async () => {
      await fetch(`/api/projects/${projectId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
    }, 1000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      loadProject();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteFile(fileId: string) {
    await fetch(`/api/projects/${projectId}/files`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    loadProject();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-500">Project not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Project name & description */}
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveDetails}
            className="text-2xl font-bold bg-transparent text-zinc-100 border-none focus:outline-none w-full"
            placeholder="Project name"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDetails}
            className="text-sm bg-transparent text-zinc-400 border-none focus:outline-none w-full mt-1"
            placeholder="Add a description..."
          />
          {saving && (
            <span className="text-[10px] text-zinc-600">Saving...</span>
          )}
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">
            Notes
          </h3>
          <p className="text-[11px] text-zinc-500 mb-2">
            Notes are shared across all chats in this project and sent as context to the AI.
          </p>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add project notes, instructions, or context that should be shared across all chats..."
            rows={8}
            className="w-full bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-600"
          />
        </div>

        {/* Files */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-zinc-300">Files</h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          <p className="text-[11px] text-zinc-500 mb-3">
            File contents are sent as context to the AI in every chat.
          </p>

          {project.files.length === 0 ? (
            <div className="border border-dashed border-zinc-700 rounded-xl p-8 text-center">
              <p className="text-sm text-zinc-500">No files yet</p>
              <p className="text-xs text-zinc-600 mt-1">Upload text files, code, or documents</p>
            </div>
          ) : (
            <div className="space-y-2">
              {project.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{file.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {formatSize(file.size)} &middot; {file.type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-zinc-500 hover:text-red-400 p-1 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chats in this project */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-zinc-300">Chats</h3>
            <Link
              href={`/chat?projectId=${projectId}`}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              New Chat
            </Link>
          </div>

          {project.conversations.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No chats in this project yet
            </p>
          ) : (
            <div className="space-y-1">
              {project.conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
                >
                  <span className="text-sm text-zinc-200 truncate">{conv.title}</span>
                  <span className="text-[10px] text-zinc-500 flex-shrink-0 ml-2">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
