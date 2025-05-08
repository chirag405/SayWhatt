"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useMemo } from "react";

export const Meteors = ({
  number,
  className,
}: {
  number?: number;
  className?: string;
}) => {
  // Using useMemo to generate meteor settings only once on client-side
  const meteorSettings = useMemo(() => {
    const count = number || 20;
    return Array.from({ length: count }, (_, idx) => {
      // Use deterministic values based on index rather than Math.random()
      const position = idx * (800 / count) - 400;

      // Create deterministic but varied values by using the index
      const delay = ((idx % 5) + idx / count) * 1.2;
      const duration = 5 + (idx % 5);

      return { position, delay, duration };
    });
  }, [number]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {meteorSettings.map((meteor, idx) => (
        <span
          key={"meteor" + idx}
          className={cn(
            "animate-meteor-effect absolute h-0.5 w-0.5 rotate-[45deg] rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10]",
            "before:absolute before:top-1/2 before:h-[1px] before:w-[50px] before:-translate-y-[50%] before:transform before:bg-gradient-to-r before:from-[#64748b] before:to-transparent before:content-['']",
            className
          )}
          style={{
            top: "-40px",
            left: `${meteor.position}px`,
            animationDelay: `${meteor.delay}s`,
            animationDuration: `${meteor.duration}s`,
          }}
        ></span>
      ))}
    </motion.div>
  );
};
