"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import type { ChatMessage, Branch } from "@/types";
import { buildChildrenMap, buildMessageMap } from "@/lib/tree";

interface GitGraphPaneProps {
  allMessages: ChatMessage[];
  activePath: ChatMessage[];
  branches: Branch[];
  activeLeafId: string | null;
  onSelectBranch: (branch: Branch) => void;
  onCreateBranch: (name: string, messageId: string) => void;
  onNodeClick: (messageId: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

const BRANCH_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

const COL_WIDTH = 24;
const ROW_HEIGHT = 32;
const NODE_RADIUS = 5;

interface NodeLayout {
  message: ChatMessage;
  column: number;
  color: string;
  // Which columns have active lines passing through this row
  activeColumns: Set<number>;
  // If this node forks from a different column, record it
  forkFromColumn: number | null;
}

function computeGraphLayout(
  messages: ChatMessage[]
): { nodes: NodeLayout[]; maxColumns: number } {
  if (messages.length === 0) return { nodes: [], maxColumns: 0 };

  // Build children index: parentId -> list of child message IDs
  // Using a plain object to avoid any Map key-type issues
  const childrenOf: Record<string, string[]> = {};
  const hasChildren = new Set<string>();
  for (const msg of messages) {
    const pid = msg.parentMessageId;
    if (pid) {
      if (!childrenOf[pid]) childrenOf[pid] = [];
      childrenOf[pid].push(msg.id);
      hasChildren.add(pid);
    }
  }

  // Track which message was the FIRST child we processed for each parent
  const firstChildProcessed = new Set<string>();

  const columnForMessage = new Map<string, number>();
  const occupiedColumns = new Set<number>();
  const nodes: NodeLayout[] = [];
  let maxColumns = 0;

  function allocateColumn(): number {
    let col = 0;
    while (occupiedColumns.has(col)) col++;
    return col;
  }

  for (const msg of messages) {
    let column: number;
    let forkFromColumn: number | null = null;
    const parentId = msg.parentMessageId;

    if (!parentId) {
      // Root message
      column = allocateColumn();
    } else {
      const parentCol = columnForMessage.get(parentId);
      const siblingIds = childrenOf[parentId] || [];
      const isFork = siblingIds.length > 1;

      if (parentCol === undefined) {
        column = allocateColumn();
      } else if (!isFork) {
        // Only child — stay in parent's column
        column = parentCol;
      } else {
        // Fork detected! First child to be processed stays in parent column,
        // subsequent children branch to new columns
        const key = parentId;
        if (!firstChildProcessed.has(key)) {
          firstChildProcessed.add(key);
          column = parentCol;
        } else {
          column = allocateColumn();
          forkFromColumn = parentCol;
        }
      }
    }

    columnForMessage.set(msg.id, column);
    occupiedColumns.add(column);
    maxColumns = Math.max(maxColumns, column + 1);

    // Snapshot active columns for SVG pass-through lines
    const activeColumns = new Set(occupiedColumns);

    // If leaf, free the column
    if (!hasChildren.has(msg.id)) {
      occupiedColumns.delete(column);
    }

    nodes.push({
      message: msg,
      column,
      color: BRANCH_COLORS[column % BRANCH_COLORS.length],
      activeColumns,
      forkFromColumn,
    });
  }

  return { nodes, maxColumns };
}

export function GitGraphPane({
  allMessages,
  activePath,
  branches,
  activeLeafId,
  onSelectBranch,
  onCreateBranch,
  onNodeClick,
  scrollRef,
}: GitGraphPaneProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
  } | null>(null);
  const [branchNameInput, setBranchNameInput] = useState("");
  const paneRef = useRef<HTMLDivElement>(null);

  const activePathIds = useMemo(
    () => new Set(activePath.map((m) => m.id)),
    [activePath]
  );

  const branchByLeaf = useMemo(() => {
    const map = new Map<string, Branch[]>();
    for (const b of branches) {
      if (!map.has(b.leafMessageId)) map.set(b.leafMessageId, []);
      map.get(b.leafMessageId)!.push(b);
    }
    return map;
  }, [branches]);

  const { nodes, maxColumns } = useMemo(
    () => computeGraphLayout(allMessages),
    [allMessages]
  );

  const svgWidth = Math.max(COL_WIDTH, maxColumns * COL_WIDTH + 8);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, messageId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, messageId });
      setBranchNameInput("");
    },
    []
  );

  const handleCreateBranch = useCallback(() => {
    if (contextMenu && branchNameInput.trim()) {
      onCreateBranch(branchNameInput.trim(), contextMenu.messageId);
      setContextMenu(null);
      setBranchNameInput("");
    }
  }, [contextMenu, branchNameInput, onCreateBranch]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  useEffect(() => {
    if (scrollRef && paneRef.current) {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current =
        paneRef.current;
    }
  }, [scrollRef]);

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function truncate(text: string, len: number) {
    return text.length > len ? text.slice(0, len) + "..." : text;
  }

  function colX(col: number) {
    return col * COL_WIDTH + COL_WIDTH / 2;
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-800 flex-shrink-0">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Graph
        </h3>
      </div>

      {/* Branch list */}
      {branches.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-800 flex flex-wrap gap-1 flex-shrink-0">
          {branches.map((branch) => (
            <button
              key={branch.id}
              onDoubleClick={() => onSelectBranch(branch)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                branch.leafMessageId === activeLeafId
                  ? "bg-blue-600/30 border-blue-500 text-blue-300"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
              title="Double-click to switch branch"
            >
              {branch.name}
            </button>
          ))}
        </div>
      )}

      {/* Graph nodes */}
      <div ref={paneRef} className="flex-1 overflow-y-auto">
        {nodes.map((node, i) => {
          const isActive = activePathIds.has(node.message.id);
          const nodeBranches = branchByLeaf.get(node.message.id);
          const cx = colX(node.column);

          // Determine which columns have lines passing through this row
          // (excluding the current node's own column which gets its own treatment)
          const passThroughColumns = Array.from(node.activeColumns).filter(
            (col) => col !== node.column
          );

          // Does this node's column continue downward?
          const hasChildInColumn = i < nodes.length - 1 && nodes.slice(i + 1).some(
            (n) => n.column === node.column && n.message.parentMessageId
          );

          // Does this node's column come from above?
          const hasParentAbove = node.message.parentMessageId !== null &&
            (node.forkFromColumn === null); // only draw top line if NOT a fork (forks draw a curve instead)

          return (
            <div
              key={node.message.id}
              data-message-id={node.message.id}
              className={`flex items-start cursor-pointer transition-colors ${
                isActive ? "bg-zinc-800/50" : "hover:bg-zinc-900"
              }`}
              onClick={() => onNodeClick(node.message.id)}
              onContextMenu={(e) => handleContextMenu(e, node.message.id)}
            >
              {/* SVG graph area */}
              <div
                className="flex-shrink-0 relative"
                style={{ width: svgWidth, height: ROW_HEIGHT }}
              >
                <svg
                  width={svgWidth}
                  height={ROW_HEIGHT}
                  className="absolute inset-0"
                >
                  {/* Pass-through lines for other active branches */}
                  {passThroughColumns.map((col) => (
                    <line
                      key={`pass-${col}`}
                      x1={colX(col)}
                      y1={0}
                      x2={colX(col)}
                      y2={ROW_HEIGHT}
                      stroke={BRANCH_COLORS[col % BRANCH_COLORS.length]}
                      strokeWidth={2}
                      opacity={0.3}
                    />
                  ))}

                  {/* Vertical line from above (same column continuation) */}
                  {hasParentAbove && (
                    <line
                      x1={cx}
                      y1={0}
                      x2={cx}
                      y2={ROW_HEIGHT / 2}
                      stroke={node.color}
                      strokeWidth={2}
                      opacity={0.6}
                    />
                  )}

                  {/* Vertical line downward (if column continues) */}
                  {hasChildInColumn && (
                    <line
                      x1={cx}
                      y1={ROW_HEIGHT / 2}
                      x2={cx}
                      y2={ROW_HEIGHT}
                      stroke={node.color}
                      strokeWidth={2}
                      opacity={0.6}
                    />
                  )}

                  {/* Fork curve: from parent's column to this node's column */}
                  {node.forkFromColumn !== null && (
                    <path
                      d={`M ${colX(node.forkFromColumn)} 0 Q ${colX(node.forkFromColumn)} ${ROW_HEIGHT / 2}, ${cx} ${ROW_HEIGHT / 2}`}
                      stroke={node.color}
                      strokeWidth={2}
                      fill="none"
                      opacity={0.6}
                    />
                  )}

                  {/* Node dot */}
                  <circle
                    cx={cx}
                    cy={ROW_HEIGHT / 2}
                    r={isActive ? NODE_RADIUS + 1 : NODE_RADIUS}
                    fill={isActive ? node.color : "#18181b"}
                    stroke={node.color}
                    strokeWidth={2}
                  />
                </svg>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 py-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] px-1 rounded ${
                      node.message.role === "user"
                        ? "bg-blue-900/40 text-blue-400"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {node.message.role === "user" ? "You" : "AI"}
                  </span>
                  <span className="text-[10px] text-zinc-600 tabular-nums flex-shrink-0">
                    {formatTime(node.message.createdAt)}
                  </span>
                  <span
                    className={`text-xs truncate ${
                      isActive ? "text-zinc-200" : "text-zinc-500"
                    }`}
                  >
                    {truncate(node.message.content, 30)}
                  </span>
                </div>
                {nodeBranches && (
                  <div className="flex gap-1 mt-0.5">
                    {nodeBranches.map((b) => (
                      <span
                        key={b.id}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onSelectBranch(b);
                        }}
                        className={`text-[10px] px-1.5 py-0 rounded cursor-pointer ${
                          b.leafMessageId === activeLeafId
                            ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
                            : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-500"
                        }`}
                      >
                        {b.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-2 min-w-[220px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-zinc-400 mb-2">Create branch here</p>
          <div className="flex gap-1">
            <input
              type="text"
              value={branchNameInput}
              onChange={(e) => setBranchNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateBranch();
                if (e.key === "Escape") setContextMenu(null);
              }}
              placeholder="Branch name..."
              className="flex-1 bg-zinc-900 text-zinc-100 text-xs border border-zinc-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateBranch}
              disabled={!branchNameInput.trim()}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white rounded transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
