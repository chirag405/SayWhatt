import { User } from "lucide-react";
import { Player } from "@/types/types";

interface GameHeaderProps {
  roundNumber: number;
  totalRounds: number;
  turnNumber: number;
  currentDecider: Player | undefined;
}

export function GameHeader({
  roundNumber,
  totalRounds,
  turnNumber,
  currentDecider,
}: GameHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">
            Round {roundNumber} of {totalRounds}
          </h1>
          <p className="text-sm text-gray-600">Turn {turnNumber}</p>
        </div>

        {currentDecider && (
          <div className="flex items-center bg-blue-50 px-4 py-2 rounded-full">
            <User className="w-5 h-5 text-blue-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Current Decider</p>
              <p className="font-medium">{currentDecider.nickname}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
