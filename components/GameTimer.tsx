import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";

interface GameTimerProps {
  endTime: Date;
  timeLimit: number;
}

export function GameTimer({ endTime, timeLimit }: GameTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(
    Math.max(0, Math.ceil((endTime.getTime() - Date.now()) / 1000))
  );

  const progress = Math.max(
    0,
    Math.min(100, (timeRemaining / timeLimit) * 100)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.ceil((endTime.getTime() - Date.now()) / 1000)
      );
      setTimeRemaining(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  // Format the time as MM:SS
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Determine color based on time remaining
  const getColorClass = () => {
    if (timeRemaining <= 10) return "text-red-400";
    if (timeRemaining <= 30) return "text-amber-400";
    return "text-blue-400";
  };

  return (
    <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-purple-500/20">
      <div className="flex flex-col">
        <div className="flex items-center">
          <Clock className="w-5 h-5 mr-2 text-gray-400" />
          <motion.span
            className={`font-mono font-bold ${getColorClass()}`}
            animate={{ scale: timeRemaining <= 10 ? [1, 1.1, 1] : 1 }}
            transition={{
              duration: 0.5,
              repeat: timeRemaining <= 10 ? Infinity : 0,
            }}
          >
            {formattedTime}
          </motion.span>
        </div>

        <div className="w-full bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
          <motion.div
            className={`h-2 rounded-full ${
              timeRemaining <= 10
                ? "bg-gradient-to-r from-red-500 to-red-400"
                : timeRemaining <= 30
                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                  : "bg-gradient-to-r from-blue-500 to-purple-500"
            }`}
            initial={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}
