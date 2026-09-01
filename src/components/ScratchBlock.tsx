"use client";

import React from "react";
import { Play, Sparkles, Move, MessageSquare, Volume2, Clock, Eye, Flag } from "lucide-react";

export type ScratchCategory =
  | "events"
  | "motion"
  | "looks"
  | "sound"
  | "control"
  | "sensing"
  | "operators"
  | "variables";

interface ScratchBlockProps {
  category: ScratchCategory;
  type?: "hat" | "stack" | "cap" | "reporter";
  text: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ScratchBlock({
  category,
  type = "stack",
  text,
  icon,
  className = "",
  onClick,
}: ScratchBlockProps) {
  // Category styling
  const categoryConfig: Record<
    ScratchCategory,
    { bg: string; border: string; defaultIcon: React.ReactNode }
  > = {
    events: {
      bg: "bg-[#FFBF00]",
      border: "border-[#E6AC00]",
      defaultIcon: <Flag className="w-3.5 h-3.5 fill-current text-green-700" />,
    },
    motion: {
      bg: "bg-[#4C97FF]",
      border: "border-[#3373CC]",
      defaultIcon: <Move className="w-3.5 h-3.5 text-white" />,
    },
    looks: {
      bg: "bg-[#9966FF]",
      border: "border-[#774DCB]",
      defaultIcon: <Eye className="w-3.5 h-3.5 text-white" />,
    },
    sound: {
      bg: "bg-[#FF6680]",
      border: "border-[#E64D67]",
      defaultIcon: <Volume2 className="w-3.5 h-3.5 text-white" />,
    },
    control: {
      bg: "bg-[#FFAB19]",
      border: "border-[#E69100]",
      defaultIcon: <Clock className="w-3.5 h-3.5 text-white" />,
    },
    sensing: {
      bg: "bg-[#4CBFE6]",
      border: "border-[#2E8EB0]",
      defaultIcon: <Sparkles className="w-3.5 h-3.5 text-white" />,
    },
    operators: {
      bg: "bg-[#59C059]",
      border: "border-[#389438]",
      defaultIcon: <Sparkles className="w-3.5 h-3.5 text-white" />,
    },
    variables: {
      bg: "bg-[#FF8C1A]",
      border: "border-[#DB6F00]",
      defaultIcon: <Sparkles className="w-3.5 h-3.5 text-white" />,
    },
  };

  const config = categoryConfig[category] || categoryConfig.motion;

  // Hat block styling (rounded arch at top)
  const isHat = type === "hat";

  // Parse text to find inline parameters like [text] or (10)
  const formatBlockText = (rawText: string) => {
    const parts = rawText.split(/(\[[^\]]+\]|\([^)]+\))/g);
    return parts.map((part, idx) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const val = part.slice(1, -1);
        return (
          <span
            key={idx}
            className="inline-block bg-white text-gray-800 px-2 py-0.5 mx-1 rounded-md text-xs font-semibold shadow-inner border border-black/10"
          >
            {val}
          </span>
        );
      }
      if (part.startsWith("(") && part.endsWith(")")) {
        const val = part.slice(1, -1);
        return (
          <span
            key={idx}
            className="inline-block bg-white text-gray-800 px-2 py-0.5 mx-1 rounded-full text-xs font-semibold shadow-inner border border-black/10 min-w-[20px] text-center"
          >
            {val}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white font-medium text-xs md:text-sm shadow-md border ${
        config.bg
      } ${config.border} ${
        isHat
          ? "rounded-t-2xl rounded-b-lg border-t-2"
          : "rounded-lg"
      } select-none transition-all duration-150 ${
        onClick ? "cursor-pointer hover:scale-105 active:scale-95" : ""
      } ${className}`}
      style={{
        boxShadow: "0 2px 0 rgba(0,0,0,0.18), 0 3px 6px rgba(0,0,0,0.08)",
        textShadow: "0 1px 1px rgba(0,0,0,0.25)",
      }}
    >
      <span className="shrink-0">{icon || config.defaultIcon}</span>
      <div className="flex items-center flex-wrap leading-tight">{formatBlockText(text)}</div>
    </div>
  );
}
