import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GameTimerProps {
  endTime: Date | null;
  timeLimit: number;
}

export function GameTimer({ endTime, timeLimit }: GameTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!endTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(endTime);
      const diffMs = end.getTime() - now.getTime();
      const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

      setTimeRemaining(diffSeconds);
      setProgress((diffSeconds / timeLimit) * 100);

      if (diffSeconds <= 0) {
        clearInterval(interval);
      }
    }, 250); // Update more frequently for smoother animation

    return () => {
      clearInterval(interval);
    };
  }, [endTime, timeLimit]);

  // Format the time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isDanger = timeRemaining <= 10;
  const isWarning = timeRemaining <= 30 && !isDanger;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-1.5">
        <motion.span
          className={cn(
            "font-mono text-sm font-medium tracking-wider",
            isDanger
              ? "text-red-400"
              : isWarning
                ? "text-amber-400"
                : "text-cyan-400"
          )}
          animate={
            isDanger
              ? {
                  scale: [1, 1.1, 1],
                  transition: { repeat: Infinity, duration: 0.8 },
                }
              : {}
          }
        >
          {formatTime(timeRemaining)}
        </motion.span>

        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: isDanger ? [0.7, 1, 0.7] : 1,
            scale: 1,
            transition: {
              opacity: { repeat: isDanger ? Infinity : 0, duration: 0.8 },
              scale: { type: "spring" },
            },
          }}
          className={cn(
            "ml-3 text-xs font-medium rounded-full px-2 py-0.5",
            isDanger
              ? "bg-red-900/40 text-red-400 border border-red-500/40"
              : isWarning
                ? "bg-amber-900/40 text-amber-400 border border-amber-500/40"
                : "bg-green-900/40 text-green-400 border border-green-500/40"
          )}
        >
          {isDanger ? "CRITICAL" : isWarning ? "HURRY" : "TIME LEFT"}
        </motion.div>
      </div>

      <div className="w-full">
        <motion.div
          className="relative h-2.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner"
          initial={{ opacity: 0.6, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className={cn(
              "absolute inset-0 h-full rounded-full",
              isDanger
                ? "bg-gradient-to-r from-red-600 to-red-400"
                : isWarning
                  ? "bg-gradient-to-r from-amber-600 to-amber-400"
                  : "bg-gradient-to-r from-cyan-500 to-blue-500"
            )}
            style={{ width: `${progress}%` }}
            initial={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />

          {/* Pulse effect for danger mode */}
          {isDanger && (
            <motion.div
              className="absolute inset-0 bg-red-400/30 rounded-full"
              animate={{
                opacity: [0.1, 0.4, 0.1],
                scale: [0.85, 1.05, 0.85],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut",
              }}
            />
          )}

          {/* Glowing particles for all states */}
          <motion.div
            className={cn(
              "absolute top-0 bottom-0 w-1.5 h-1.5 rounded-full",
              isDanger
                ? "bg-red-300"
                : isWarning
                  ? "bg-amber-300"
                  : "bg-blue-300"
            )}
            style={{ left: `${progress - 1}%` }}
            animate={{
              opacity: [0.7, 1, 0.7],
              boxShadow: [
                isDanger
                  ? "0 0 2px #f87171"
                  : isWarning
                    ? "0 0 2px #fcd34d"
                    : "0 0 2px #7dd3fc",
                isDanger
                  ? "0 0 5px #f87171"
                  : isWarning
                    ? "0 0 5px #fcd34d"
                    : "0 0 5px #7dd3fc",
                isDanger
                  ? "0 0 2px #f87171"
                  : isWarning
                    ? "0 0 2px #fcd34d"
                    : "0 0 2px #7dd3fc",
              ],
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        </motion.div>
      </div>
    </div>
  );
}
