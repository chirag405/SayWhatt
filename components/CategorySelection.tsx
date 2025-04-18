import { useState, useEffect } from "react";
import { Player, Turn } from "@/types/types";
import { useGameStore } from "@/store/game-store";

interface CategorySelectionProps {
  roundId: string;
  turnId: string;
  userId: string;
  isDecider: boolean;
  currentDecider: Player | undefined;
}

export function CategorySelection({
  roundId,
  turnId,
  userId,
  isDecider,
  currentDecider,
}: CategorySelectionProps) {
  const { selectCategory, currentTurn } = useGameStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The current category from the database
  const currentCategory = currentTurn?.category;

  // Current turn status
  const currentStatus = currentTurn?.status;

  const categories = [
    "Everyday Life",
    "Technology",
    "Entertainment",
    "Hypothetical Scenarios",
  ];

  const handleSelectCategory = async (category: string) => {
    if (!isDecider) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("Selecting category:", category, "for turn:", turnId);
      const result = await selectCategory(turnId, category, userId);
      console.log("Category selection result:", result);

      if (!result) {
        setError("Failed to select category. Please try again.");
      }

      // We don't need to manually update local state anymore
      // The subscription will handle that
    } catch (err) {
      console.error("Error selecting category:", err);
      setError("An error occurred while selecting the category.");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if we're past the category selection phase
  const isCategorySelected =
    currentCategory !== null && currentCategory !== undefined;

  // Check if we're in scenario selection or later phases
  const isInScenarioSelectionPhase =
    currentStatus === "selecting_scenario" ||
    currentStatus === "answering" ||
    currentStatus === "voting";

  // If we're already past category selection
  if (isCategorySelected && isInScenarioSelectionPhase) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold mb-6">
          Category selected: {currentCategory}
        </h2>
        <p className="text-lg">
          {currentStatus === "selecting_scenario"
            ? "Waiting for scenario selection..."
            : "Moving to next phase..."}
        </p>
      </div>
    );
  }

  // If our local UI thinks we've selected but we haven't gotten confirmation
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold mb-6">
          Processing category selection...
        </h2>
        <p className="text-lg animate-pulse">Updating game state...</p>
      </div>
    );
  }

  // Default view - selecting a category
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold mb-6">
        {isDecider
          ? "Select a Category"
          : `${currentDecider?.nickname || "Decider"} is selecting a category...`}
      </h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isDecider ? (
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleSelectCategory(category)}
              disabled={isLoading}
              className={`
                font-bold py-4 px-8 rounded-lg transition-colors duration-200
                ${isLoading ? "opacity-50" : ""}
                bg-blue-500 hover:bg-blue-600 text-white
              `}
            >
              {category}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-6 bg-gray-100 rounded-lg shadow-md">
          <p className="text-xl animate-pulse">
            Waiting for category selection...
          </p>
        </div>
      )}
    </div>
  );
}
