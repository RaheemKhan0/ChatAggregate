"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type EdgeTypes,
  type NodeTypes,
  type NodeProps,
  Handle,
  Position,
  useReactFlow,
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
// CSS imported in globals.css
import dagre from "dagre";
import type { ChatMessage, Branch } from "@/types";
import { getPathToMessage } from "@/lib/tree";

// --- Deterministic color from string ---

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const h = ((hash % 360) + 360) % 360;
  return `hsl(${h}, 70%, 60%)`;
}

// --- Types & Constants ---

interface GitGraphPaneProps {
  allMessages: ChatMessage[];
  activePath: ChatMessage[];
  branches: Branch[];
  activeLeafId: string | null;
  onSelectBranch: (branch: Branch) => void;
  onCreateBranch: (name: string, messageId: string) => void;
  onNodeClick: (messageId: string) => void;
}

const NODE_WIDTH = 230;
const NODE_HEIGHT = 70;

interface MessageNodeData {
  role: string;
  content: string;
  model?: string | null;
  createdAt: string;
  isActive: boolean;
  hasBranch: boolean;
  branchColor: string | null;
  branches: Branch[];
  activeLeafId: string | null;
  onSelectBranch: (branch: Branch) => void;
  onCreateBranch: (name: string, messageId: string) => void;
  onFocusBranch: (branch: Branch) => void;
  messageId: string;
}

// --- Animated Edge with travelling circle ---

function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const edgeData = data as { isActive?: boolean; color?: string } | undefined;
  const isActive = edgeData?.isActive ?? false;
  const color = edgeData?.color ?? "#3b82f6";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      {isActive && (
        <circle r={4} fill={color} filter={`drop-shadow(0 0 4px ${color})`}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
};

// --- Custom Node Component ---

function MessageNode({ data }: NodeProps<Node<MessageNodeData>>) {
  const [hovered, setHovered] = useState(false);
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [showNoBranchToast, setShowNoBranchToast] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchError, setBranchError] = useState("");

  const isUser = data.role === "user";
  const branchColor = data.branchColor;

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleCreateBranch() {
    if (branchName.trim()) {
      data.onCreateBranch(branchName.trim(), data.messageId);
      setShowBranchInput(false);
      setBranchName("");
      setBranchError("");
    }
  }

  function handleNodeBodyClick(e: React.MouseEvent) {
    if (!data.hasBranch && !showBranchInput) {
      e.stopPropagation();
      setShowNoBranchToast(true);
      setTimeout(() => setShowNoBranchToast(false), 2500);
    }
  }

  const borderColor = branchColor
    ? branchColor
    : data.isActive
      ? "#3b82f6"
      : hovered
        ? "#71717a"
        : "rgba(63,63,70,0.5)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        if (!showBranchInput) {
          setShowBranchInput(false);
          setBranchError("");
        }
      }}
      onClick={handleNodeBodyClick}
      className={`rounded-xl px-3 py-2.5 text-xs transition-all duration-200 relative ${
        data.isActive
          ? "bg-zinc-800 shadow-lg"
          : hovered
            ? "bg-zinc-800/80 shadow-md shadow-zinc-800/50"
            : "bg-zinc-900 opacity-50"
      } ${hovered ? "scale-[1.02]" : ""}`}
      style={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor,
        boxShadow: branchColor ? `0 0 12px ${branchColor}33` : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-zinc-500 !w-2 !h-2 !border-0 !-top-1"
      />

      {/* Toast popup */}
      {showNoBranchToast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-zinc-700 text-zinc-200 text-[10px] rounded-lg shadow-lg whitespace-nowrap border border-zinc-600 animate-fade-in">
          Create a branch to view this message
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-zinc-700 border-r border-b border-zinc-600 rotate-45 -mt-1" />
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            isUser
              ? "bg-blue-600/30 text-blue-300"
              : "bg-emerald-900/40 text-emerald-400"
          }`}
        >
          {isUser ? "You" : "AI"}
        </span>
        <span className="text-[10px] text-zinc-500 tabular-nums">
          {formatTime(data.createdAt)}
        </span>
        {data.model && !isUser && (
          <span className="text-[10px] text-zinc-600 ml-auto truncate max-w-[80px]">
            {data.model.split("/").pop()}
          </span>
        )}
      </div>

      {/* Content preview */}
      <p
        className={`text-[11px] leading-relaxed line-clamp-2 ${
          data.isActive ? "text-zinc-200" : "text-zinc-500"
        }`}
      >
        {data.content}
      </p>

      {/* Branch labels */}
      {data.hasBranch && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {data.branches.map((b) => {
            const bColor = stringToColor(b.name);
            return (
              <span
                key={b.id}
                className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${bColor}20`,
                  color: bColor,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: `${bColor}50`,
                }}
              >
                {b.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Hover actions */}
      {hovered && !showBranchInput && (
        <div className="flex gap-1 mt-2">
          {/* Focus button — only for branched nodes */}
          {data.hasBranch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onFocusBranch(data.branches[0]);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-zinc-400 hover:text-blue-300 bg-zinc-900/80 hover:bg-blue-900/20 border border-zinc-700 hover:border-blue-500/50 rounded-md transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Focus
            </button>
          )}
          {/* Add branch button — only for non-branched nodes */}
          {!data.hasBranch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBranchInput(true);
                setBranchName("");
                setBranchError("");
                setShowNoBranchToast(false);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-zinc-400 hover:text-blue-300 bg-zinc-900/80 hover:bg-blue-900/20 border border-zinc-700 hover:border-blue-500/50 rounded-md transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Branch
            </button>
          )}
        </div>
      )}

      {/* Branch name input */}
      {showBranchInput && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            <input
              type="text"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                setBranchError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateBranch();
                if (e.key === "Escape") {
                  setShowBranchInput(false);
                  setBranchError("");
                }
              }}
              placeholder="Branch name..."
              className="flex-1 bg-zinc-950 text-zinc-100 text-[10px] border border-zinc-600 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateBranch}
              disabled={!branchName.trim()}
              className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white rounded transition-colors"
            >
              Create
            </button>
          </div>
          {branchError && (
            <p className="text-[9px] text-red-400 mt-1">{branchError}</p>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-500 !w-2 !h-2 !border-0 !-bottom-1"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  message: MessageNode,
};

// --- Dagre Layout ---

function getLayoutedPositions(
  messages: ChatMessage[]
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 50,
    marginx: 30,
    marginy: 30,
  });

  messages.forEach((msg) => {
    g.setNode(msg.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  messages.forEach((msg) => {
    if (msg.parentMessageId) {
      g.setEdge(msg.parentMessageId, msg.id);
    }
  });

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  messages.forEach((msg) => {
    const n = g.node(msg.id);
    positions.set(msg.id, {
      x: n.x - NODE_WIDTH / 2,
      y: n.y - NODE_HEIGHT / 2,
    });
  });

  return positions;
}

// --- Main Component ---

function GitGraphInner({
  allMessages,
  activePath,
  branches,
  activeLeafId,
  onSelectBranch,
  onCreateBranch,
  onNodeClick,
}: GitGraphPaneProps) {
  const { fitView } = useReactFlow();
  const [focusedBranch, setFocusedBranch] = useState<Branch | null>(null);

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

  const branchForMessage = useMemo(() => {
    const map = new Map<string, Branch>();
    for (const b of branches) {
      map.set(b.leafMessageId, b);
    }
    return map;
  }, [branches]);

  // In focus mode, show the focused branch's path PLUS any new messages
  // on the current active path (so the user sees messages they send live)
  const visibleMessages = useMemo(() => {
    if (!focusedBranch) return allMessages;

    const branchPath = getPathToMessage(allMessages, focusedBranch.leafMessageId);
    const branchPathIds = new Set(branchPath.map((m) => m.id));

    // Also include active path messages (covers new messages sent while focused)
    const combined = new Set(branchPathIds);
    for (const m of activePath) {
      combined.add(m.id);
    }

    return allMessages.filter((m) => combined.has(m.id));
  }, [focusedBranch, allMessages, activePath]);

  // Compute dagre positions for visible messages
  const positions = useMemo(
    () => getLayoutedPositions(visibleMessages),
    [visibleMessages]
  );

  // Build nodes
  const nodes = useMemo((): Node<MessageNodeData>[] => {
    return visibleMessages.map((msg) => {
      const pos = positions.get(msg.id) || { x: 0, y: 0 };
      const msgBranches = branchByLeaf.get(msg.id) || [];
      const hasBranch = msgBranches.length > 0;
      const branchColor = hasBranch ? stringToColor(msgBranches[0].name) : null;

      return {
        id: msg.id,
        type: "message",
        position: pos,
        data: {
          role: msg.role,
          content: msg.content,
          model: msg.model,
          createdAt: msg.createdAt,
          isActive: activePathIds.has(msg.id),
          hasBranch,
          branchColor,
          branches: msgBranches,
          activeLeafId,
          onSelectBranch,
          onCreateBranch,
          onFocusBranch: setFocusedBranch,
          messageId: msg.id,
        },
      };
    });
  }, [visibleMessages, positions, activePathIds, branchByLeaf, activeLeafId, onSelectBranch, onCreateBranch]);

  // Find the color of the currently selected branch
  const activeBranchColor = useMemo(() => {
    if (!activeLeafId) return null;
    const branch = branches.find((b) => b.leafMessageId === activeLeafId);
    return branch ? stringToColor(branch.name) : null;
  }, [activeLeafId, branches]);

  // Build edges
  const edges = useMemo((): Edge[] => {
    return visibleMessages
      .filter((msg) => msg.parentMessageId && positions.has(msg.parentMessageId))
      .map((msg) => {
        const isActive = activePathIds.has(msg.id);
        const edgeColor = isActive && activeBranchColor
          ? activeBranchColor
          : "#3f3f46";

        return {
          id: `e-${msg.parentMessageId}-${msg.id}`,
          source: msg.parentMessageId!,
          target: msg.id,
          type: "animated",
          data: {
            isActive,
            color: isActive && activeBranchColor ? activeBranchColor : "#3b82f6",
          },
          style: {
            stroke: edgeColor,
            strokeWidth: isActive ? 2.5 : 1.5,
          },
        };
      });
  }, [visibleMessages, positions, activePathIds, activeBranchColor]);

  // Fit view when visible nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 50);
    }
  }, [visibleMessages.length, focusedBranch, fitView]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const branch = branchForMessage.get(node.id);
      if (branch) {
        onSelectBranch(branch);
      }
      onNodeClick(node.id);
    },
    [onNodeClick, onSelectBranch, branchForMessage]
  );

  const focusColor = focusedBranch ? stringToColor(focusedBranch.name) : null;

  return (
    <>
      {/* Focus mode banner */}
      {focusedBranch && (
        <div
          className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
          style={{
            backgroundColor: `${focusColor}10`,
            borderColor: `${focusColor}30`,
          }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5" style={{ color: focusColor! }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-[11px] font-medium" style={{ color: focusColor! }}>
              Focused: {focusedBranch.name}
            </span>
          </div>
          <button
            onClick={() => setFocusedBranch(null)}
            className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            Exit Focus
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        colorMode="dark"
      >
        <Background color="#27272a" gap={24} size={1.5} />
      </ReactFlow>
    </>
  );
}

// --- Export with Provider ---

export function GitGraphPane(props: GitGraphPaneProps) {
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800 flex-shrink-0">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Graph
        </h3>
      </div>

      {/* Branch pills */}
      {props.branches.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-800 flex flex-wrap gap-1.5 flex-shrink-0">
          {props.branches.map((branch) => {
            const color = stringToColor(branch.name);
            const isActive = branch.leafMessageId === props.activeLeafId;
            return (
              <button
                key={branch.id}
                onClick={() => props.onSelectBranch(branch)}
                className="px-2.5 py-1 text-xs rounded-full transition-all duration-200"
                style={{
                  backgroundColor: isActive ? `${color}30` : "rgba(39,39,42,0.5)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: isActive ? color : "#3f3f46",
                  color: isActive ? color : "#a1a1aa",
                  boxShadow: isActive ? `0 0 8px ${color}33` : undefined,
                }}
              >
                {branch.name}
              </button>
            );
          })}
        </div>
      )}

      {/* React Flow canvas */}
      <div className="flex-1">
        <ReactFlowProvider>
          <GitGraphInner {...props} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
