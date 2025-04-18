"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
  hoverScale?: number;
}

export const GradientButton = ({
  children,
  className,
  gradientFrom = "from-purple-500",
  gradientTo = "to-pink-500",
  hoverScale = 1.03,
  ...props
}: GradientButtonProps) => {
  return (
    <motion.button
      className={cn(
        "relative px-6 py-3 rounded-lg font-medium text-white",
        "bg-gradient-to-r",
        gradientFrom,
        gradientTo,
        "outline-none focus:ring-2 focus:ring-purple-500/50",
        "transition-all duration-300 ease-out",
        className
      )}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: 0.98 }}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 rounded-lg overflow-hidden">
        <span className="absolute inset-0 opacity-0 hover:opacity-30 bg-gradient-to-r from-white to-transparent transition-opacity duration-300" />
      </span>
    </motion.button>
  );
};
