import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

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
    if (timeRemaining <= 10) return "text-red-600";
    if (timeRemaining <= 30) return "text-orange-500";
    return "text-blue-600";
  };

  return (
    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
      <div className="container mx-auto">
        <div className="flex items-center">
          <Clock className="w-5 h-5 mr-2 text-gray-500" />
          <span className={`font-mono font-bold ${getColorClass()}`}>
            {formattedTime}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div
            className={`h-2 rounded-full ${timeRemaining <= 10 ? "bg-red-600" : timeRemaining <= 30 ? "bg-orange-500" : "bg-blue-600"}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
