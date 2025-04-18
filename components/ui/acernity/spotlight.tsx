"use client";

import { cn } from "@/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";
import React, { useState } from "react";

interface SpotlightProps extends HTMLMotionProps<"div"> {
  children?: React.ReactNode;
  className?: string;
  fill?: string; // added for backward compatibility
}

const AcernitySpotlight = ({
  children,
  className,
  fill = "rgba(120, 119, 198, 0.3)", // default fallback color
  ...props
}: SpotlightProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      className={cn("relative overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 z-10">
        <div
          className="absolute -inset-[100%] opacity-50"
          style={{
            background: `radial-gradient(circle 400px at ${position.x}px ${position.y}px, ${fill}, transparent)`,
          }}
        />
      </div>
      {children}
    </motion.div>
  );
};

export default AcernitySpotlight;
