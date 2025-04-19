"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  gradientFrom?: string; // legacy
  gradientTo?: string; // legacy
  fromColor?: string; // preferred
  toColor?: string; // preferred
  hoverScale?: number;
  variant?: "primary" | "secondary";
}

export const GradientButton = ({
  children,
  className,
  gradientFrom,
  gradientTo,
  fromColor,
  toColor,
  hoverScale = 1.03,
  variant = "primary",
  ...props
}: GradientButtonProps) => {
  // Prefer new props if available
  const from = fromColor || gradientFrom || "from-purple-500";
  const to = toColor || gradientTo || "to-pink-500";

  // You can use `variant` for further styling logic if needed
  const variantClass =
    variant === "secondary"
      ? "text-white" // adjust secondary variant style
      : "text-white";

  return (
    <motion.button
      className={cn(
        "relative px-6 py-3 rounded-lg font-medium",
        "bg-gradient-to-r",
        from,
        to,
        "outline-none focus:ring-2 focus:ring-purple-500/50",
        "transition-all duration-300 ease-out",
        variantClass,
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
