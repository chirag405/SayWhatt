"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface GlowingTextProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export const GlowingText = ({
  children,
  className,
  glowColor = "rgba(139, 92, 246, 0.6)",
}: GlowingTextProps) => {
  return (
    <span
      className={cn(
        "relative inline-block text-transparent bg-clip-text bg-gradient-to-r       from-purple-400 to-pink-400",
        className
      )}
      style={{
        textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`,
      }}
    >
      {children}
    </span>
  );
};
