"use client";

import { useEffect, useRef } from "react";

interface MenuItem {
  label: string;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
      style={
        x > window.innerWidth / 2
          ? { right: window.innerWidth - x, top: y }
          : { left: x, top: y }
      }
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            onClose();
            item.onClick();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
