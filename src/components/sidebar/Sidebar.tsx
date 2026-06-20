"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useConversationsContext } from "@/contexts/ConversationsContext";
import { useProjects } from "@/hooks/useProjects";
import { ConversationItem } from "./ConversationItem";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { conversations, loading, deleteConversation, renameConversation } =
    useConversationsContext();
  const { projects, loading: projectsLoading, createProject, deleteProject } =
    useProjects();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const activeId = pathname?.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : undefined;

  const activeProjectId = pathname?.startsWith("/project/")
    ? pathname.split("/project/")[1]
    : undefined;

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      await createProject(newProjectName.trim());
      setNewProjectName("");
      setShowNewProject(false);
    }
  };

  // Group conversations by project
  const standaloneChats = conversations.filter((c) => !c.projectId);
  const chatsByProject = new Map<string, typeof conversations>();
  for (const conv of conversations) {
    if (conv.projectId) {
      if (!chatsByProject.has(conv.projectId)) chatsByProject.set(conv.projectId, []);
      chatsByProject.get(conv.projectId)!.push(conv);
    }
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 space-y-2">
          <Link
            href="/chat"
            onClick={onClose}
            className="flex items-center gap-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Projects section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Projects
              </span>
              <button
                onClick={() => setShowNewProject(!showNewProject)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* New project input */}
            {showNewProject && (
              <div className="flex gap-1 px-2 mb-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProject();
                    if (e.key === "Escape") setShowNewProject(false);
                  }}
                  placeholder="Project name..."
                  className="flex-1 bg-zinc-800 text-zinc-100 text-xs border border-zinc-700 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white rounded transition-colors"
                >
                  Add
                </button>
              </div>
            )}

            {projectsLoading ? (
              <div className="space-y-1 px-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-7 bg-zinc-800 rounded animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 && !showNewProject ? (
              <p className="text-[11px] text-zinc-600 text-center py-2">No projects</p>
            ) : (
              <div className="space-y-0.5">
                {projects.map((project) => {
                  const isExpanded = expandedProjects.has(project.id);
                  const projectChats = chatsByProject.get(project.id) || [];
                  const isActiveProject = activeProjectId === project.id;

                  return (
                    <div key={project.id}>
                      {/* Project folder row */}
                      <div
                        className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                          isActiveProject
                            ? "bg-zinc-700 text-zinc-100"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                      >
                        <button
                          onClick={() => toggleProject(project.id)}
                          className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                        >
                          <svg
                            className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <svg className="w-4 h-4 flex-shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <Link
                          href={`/project/${project.id}`}
                          onClick={onClose}
                          className="flex-1 truncate text-xs"
                        >
                          {project.name}
                        </Link>
                        <span className="text-[10px] text-zinc-600">
                          {projectChats.length}
                        </span>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="hidden group-hover:block text-zinc-500 hover:text-red-400 p-0.5 flex-shrink-0"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Expanded: chats within this project */}
                      {isExpanded && (
                        <div className="ml-5 pl-2 border-l border-zinc-800 space-y-0.5 mt-0.5">
                          {projectChats.map((conv) => (
                            <ConversationItem
                              key={conv.id}
                              id={conv.id}
                              title={conv.title}
                              isActive={activeId === conv.id}
                              onDelete={deleteConversation}
                              onRename={renameConversation}
                            />
                          ))}
                          <Link
                            href={`/chat?projectId=${project.id}`}
                            onClick={onClose}
                            className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Chat
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Standalone chats section */}
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2">
              Chats
            </span>
            <div className="mt-1 space-y-0.5">
              {loading ? (
                <div className="space-y-1 px-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-7 bg-zinc-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : standaloneChats.length === 0 ? (
                <p className="text-[11px] text-zinc-600 text-center py-2">No chats</p>
              ) : (
                standaloneChats.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    id={conv.id}
                    title={conv.title}
                    isActive={activeId === conv.id}
                    onDelete={deleteConversation}
                    onRename={renameConversation}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 space-y-1">
          <Link
            href="/settings"
            onClick={onClose}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
              pathname === "/settings"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
