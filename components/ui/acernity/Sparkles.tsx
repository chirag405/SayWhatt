"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface SparklesProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  minSize?: number;
  maxSize?: number;
  count?: number;
}

export const Sparkles = ({
  children,
  className,
  color = "#8b5cf6",
  minSize = 2,
  maxSize = 4,
  count = 20,
}: SparklesProps) => {
  const [sparkles, setSparkles] = useState<
    { id: number; size: number; x: number; y: number; opacity: number }[]
  >([]);

  useEffect(() => {
    const generateSparkles = () => {
      const newSparkles = Array.from({ length: count }).map((_, i) => ({
        id: i,
        size: Math.random() * (maxSize - minSize) + minSize,
        x: Math.random() * 100,
        y: Math.random() * 100,
        opacity: Math.random() * 0.7 + 0.3,
      }));
      setSparkles(newSparkles);
    };

    generateSparkles();
  }, [count, minSize, maxSize]);

  return (
    <div className={cn("relative inline-block", className)}>
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute rounded-full z-0 pointer-events-none"
          style={{
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            backgroundColor: color,
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            opacity: sparkle.opacity,
          }}
          animate={{
            opacity: [sparkle.opacity, 0.9, sparkle.opacity],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            repeatType: "reverse",
            delay: Math.random() * 2,
          }}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
