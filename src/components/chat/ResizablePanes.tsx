"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ResizablePanesProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  storageKey?: string;
}

export function ResizablePanes({
  left,
  right,
  defaultLeftWidth = 300,
  minLeftWidth = 200,
  maxLeftWidth = 600,
  storageKey = "gitgraph-pane-width",
}: ResizablePanesProps) {
  const [leftWidth, setLeftWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) return Math.max(minLeftWidth, Math.min(maxLeftWidth, parseInt(saved)));
    }
    return defaultLeftWidth;
  });

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(
        minLeftWidth,
        Math.min(maxLeftWidth, e.clientX - rect.left)
      );
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem(storageKey, leftWidth.toString());
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [leftWidth, minLeftWidth, maxLeftWidth, storageKey]);

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      {/* Left pane */}
      <div style={{ width: leftWidth, minWidth: minLeftWidth }} className="flex-shrink-0 overflow-hidden">
        {left}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 flex-shrink-0 bg-zinc-800 hover:bg-blue-500 cursor-col-resize transition-colors"
      />

      {/* Right pane */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {right}
      </div>
    </div>
  );
}
