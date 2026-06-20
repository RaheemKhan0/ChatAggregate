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
  branches: Branch[];
  activeLeafId: string | null;
  onSelectBranch: (branch: Branch) => void;
  onCreateBranch: (name: string, messageId: string) => void;
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

  const isActive = (data as { isActive?: boolean })?.isActive ?? false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
      />
      {isActive && (
        <circle r={4} fill="#3b82f6" filter="drop-shadow(0 0 4px #3b82f6)">
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
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
  const [branchName, setBranchName] = useState("");

  const isUser = data.role === "user";
  const hasBranch = data.branches.length > 0;

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
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        if (!showBranchInput) setShowBranchInput(false);
      }}
      className={`rounded-xl border px-3 py-2.5 text-xs transition-all duration-200 ${
        data.isActive
          ? "bg-zinc-800 border-blue-500 shadow-lg shadow-blue-500/20"
          : hovered
            ? "bg-zinc-800/80 border-zinc-500 shadow-md shadow-zinc-800/50"
            : "bg-zinc-900 border-zinc-700/50 opacity-50"
      } ${hovered ? "scale-[1.02]" : ""}`}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-zinc-500 !w-2 !h-2 !border-0 !-top-1"
      />

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
      {hasBranch && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {data.branches.map((b) => (
            <span
              key={b.id}
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                b.leafMessageId === data.activeLeafId
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700"
              }`}
            >
              {b.name}
            </span>
          ))}
        </div>
      )}

      {/* Hover action: add branch button */}
      {hovered && !showBranchInput && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowBranchInput(true);
            setBranchName("");
          }}
          className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-zinc-400 hover:text-blue-300 bg-zinc-900/80 hover:bg-blue-900/20 border border-zinc-700 hover:border-blue-500/50 rounded-md transition-all"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Branch
        </button>
      )}

      {/* Branch name input */}
      {showBranchInput && (
        <div
          className="mt-2 flex gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateBranch();
              if (e.key === "Escape") setShowBranchInput(false);
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

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 50,
    marginx: 30,
    marginy: 30,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
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

  // Build a reverse lookup: messageId -> branch (if this message is a leaf of any branch)
  const branchForMessage = useMemo(() => {
    const map = new Map<string, Branch>();
    for (const b of branches) {
      map.set(b.leafMessageId, b);
    }
    return map;
  }, [branches]);

  // Step 1: Layout (only recomputes when tree structure changes)
  const layout = useMemo(() => {
    const rawNodes: Node[] = allMessages.map((msg) => ({
      id: msg.id,
      type: "message",
      position: { x: 0, y: 0 },
      data: {} as MessageNodeData,
    }));

    const rawEdges: Edge[] = allMessages
      .filter((msg) => msg.parentMessageId)
      .map((msg) => ({
        id: `e-${msg.parentMessageId}-${msg.id}`,
        source: msg.parentMessageId!,
        target: msg.id,
        type: "animated",
      }));

    return getLayoutedElements(rawNodes, rawEdges);
  }, [allMessages]);

  // Step 2: Apply data and styling (cheap)
  const messageMap = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of allMessages) map.set(m.id, m);
    return map;
  }, [allMessages]);

  const nodes = useMemo(() => {
    return layout.nodes.map((node) => {
      const msg = messageMap.get(node.id)!;
      return {
        ...node,
        data: {
          role: msg.role,
          content: msg.content,
          model: msg.model,
          createdAt: msg.createdAt,
          isActive: activePathIds.has(msg.id),
          branches: branchByLeaf.get(msg.id) || [],
          activeLeafId,
          onSelectBranch,
          onCreateBranch,
          messageId: msg.id,
        } satisfies MessageNodeData,
      };
    });
  }, [layout.nodes, messageMap, activePathIds, branchByLeaf, activeLeafId, onSelectBranch, onCreateBranch]);

  const edges = useMemo(() => {
    return layout.edges.map((edge) => {
      const isActive = activePathIds.has(edge.target);
      return {
        ...edge,
        data: { isActive },
        style: {
          stroke: isActive ? "#3b82f6" : "#3f3f46",
          strokeWidth: isActive ? 2.5 : 1.5,
        },
      };
    });
  }, [layout.edges, activePathIds]);

  // Fit view when node count changes
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    }
  }, [nodes.length, fitView]);

  // On node click: if the node has a branch, switch to it. Otherwise just scroll right pane.
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

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={handleNodeClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
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
          {props.branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => props.onSelectBranch(branch)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all duration-200 ${
                branch.leafMessageId === props.activeLeafId
                  ? "bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm shadow-blue-500/20"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
              }`}
            >
              {branch.name}
            </button>
          ))}
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
