"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from "react";

interface GameTimerProps {
  endTime: number;
  timeLimit: number;
  className?: string;
}

export const GameTimer = ({
  endTime,
  timeLimit,
  className,
}: GameTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isWarning, setIsWarning] = useState(false);
  const [isDanger, setIsDanger] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const difference = endTime - now;
      return Math.max(0, Math.floor(difference / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      // Set warning states
      const warningThreshold = timeLimit * 0.4; // 40% of time left
      const dangerThreshold = timeLimit * 0.2; // 20% of time left

      setIsWarning(
        remaining <= warningThreshold && remaining > dangerThreshold
      );
      setIsDanger(remaining <= dangerThreshold);

      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, timeLimit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const progressPercentage = (timeLeft / timeLimit) * 100;

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "h-full",
            isDanger
              ? "bg-red-500"
              : isWarning
                ? "bg-orange-400"
                : "bg-green-400"
          )}
          initial={{ width: `${progressPercentage}%` }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span
        className={cn(
          "font-mono font-medium",
          isDanger
            ? "text-red-400"
            : isWarning
              ? "text-orange-400"
              : "text-green-400"
        )}
      >
        {formatTime(timeLeft)}
      </span>
      <AnimatePresence>
        {isDanger && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-red-400"
          >
            ⚠️
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};
