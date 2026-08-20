"use client";
import { useState } from "react";

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

export function ActionButton({ icon, label, onClick, isActive = false }: ActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group flex flex-col items-center gap-2 transition-all duration-200 ${
        isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
      }`}
    >
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
          isActive
            ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)]"
            : isHovered
            ? "bg-slate-700 text-white"
            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
        }`}
      >
        {icon}
        {isActive && (
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </span>
        )}
      </div>
      <span className="text-xs font-medium text-slate-400 transition-colors group-hover:text-slate-200">
        {label}
      </span>
    </button>
  );
}
