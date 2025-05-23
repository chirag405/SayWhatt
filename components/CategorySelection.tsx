import { useState, useEffect } from "react";
import { Player } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

import Sparkles from "@/components/ui/Sparkles";
import { GlowingText } from "@/components/ui/glowing-text";
import { playSound, SOUND_PATHS } from "@/utils/soundUtils"; // Added sound imports

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(40); // 40 seconds timer

  // The current category from the database
  const currentCategory = currentTurn?.category;

  // Current turn status
  const currentStatus = currentTurn?.status;
  const categories = [
    {
      id: "relationship",
      name: "Relationship Drama",
      color: "rose",
      emoji: "💔",
      description: "Romantic mishaps & family chaos",
    },
    {
      id: "chaos",
      name: "Hilarious Chaos",
      color: "yellow",
      emoji: "🤪",
      description: "Wild situations & unpredictable events",
    },
    {
      id: "lifedeath",
      name: "Life-or-Death Dilemmas",
      color: "red",
      emoji: "💀",
      description: "Extreme choices in dire situations",
    },
    {
      id: "embarrassing",
      name: "Embarrassing Moments",
      color: "orange",
      emoji: "😳",
      description: "Awkward situations & social disasters",
    },
  ];

  const handleSelectCategory = async (category: string) => {
    if (!isDecider) return;

    setIsLoading(true);
    setSelectedCategory(category);
    setError(null);

    try {
      console.log("Selecting category:", category, "for turn:", turnId);
      const result = await selectCategory(turnId, category, userId);
      console.log("Category selection result:", result);

      if (!result) {
        setError("Failed to select category. Please try again.");
        setSelectedCategory(null);
      } else {
        // Play the category selection sound when a category is selected
        playSound(SOUND_PATHS.categorySelect, "category");
      }
    } catch (err) {
      console.error("Error selecting category:", err);
      setError("An error occurred while selecting the category.");
      setSelectedCategory(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Select random category when timer expires
  useEffect(() => {
    // Only run timer if user is the decider and no category is selected yet
    if (
      !isDecider ||
      currentCategory ||
      !currentTurn ||
      currentTurn.status !== "selecting_category"
    ) {
      return;
    }

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          // Select random category when time expires
          const randomIndex = Math.floor(Math.random() * categories.length);
          const randomCategory = categories[randomIndex].name;
          handleSelectCategory(randomCategory);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDecider, currentCategory, currentTurn]);

  // Reset timer when turn changes
  useEffect(() => {
    if (
      isDecider &&
      !currentCategory &&
      currentTurn?.status === "selecting_category"
    ) {
      setTimeLeft(40);
    }
  }, [currentTurn?.id]);

  // Determine if we're past the category selection phase
  const isCategorySelected =
    currentCategory !== null && currentCategory !== undefined;

  // Check if we're in scenario selection or later phases
  const isInScenarioSelectionPhase =
    currentStatus === "selecting_scenario" ||
    currentStatus === "answering" ||
    currentStatus === "voting";

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // If we're already past category selection
  if (isCategorySelected && isInScenarioSelectionPhase) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <Sparkles>
            {" "}
            <GlowingText className="text-2xl font-bold mb-4">
              Category selected:{" "}
              <span className="text-purple-200">
                {categories.find((c) => c.name === currentCategory)?.emoji ||
                  ""}{" "}
                {currentCategory}
              </span>
            </GlowingText>
          </Sparkles>

          <Card className="p-6 text-center bg-slate-800 border border-purple-500/20">
            <p className="text-lg text-purple-200">
              Waiting for scenario selection...
            </p>
            <div className="mt-4 flex justify-center">
              <div className="w-8 h-8 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin mx-auto" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // If our local UI thinks we've selected but we haven't gotten confirmation
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <Sparkles>
            <GlowingText className="text-2xl font-bold mb-4">
              Processing category selection...
            </GlowingText>
          </Sparkles>

          <Card className="p-6 text-center bg-slate-800 border border-purple-500/20">
            <p className="text-lg text-purple-200 animate-pulse">
              Updating game state...
            </p>
            <div className="mt-4 flex justify-center">
              <div className="w-8 h-8 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin mx-auto" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Default view - selecting a category
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-2 md:px-4">
      <div className="text-center mb-8">
        <Sparkles>
          <GlowingText className="text-3xl md:text-4xl font-bold mb-2">
            {isDecider
              ? "Select a Category"
              : `${currentDecider?.nickname || "Decider"} is selecting a category`}
          </GlowingText>
        </Sparkles>
        {isDecider && (
          <div className="mb-4">
            <span
              className={`text-lg font-semibold bg-black/30 px-4 py-2 rounded-full text-white border border-purple-500/20 ${
                timeLeft <= 10 ? "text-red-300" : ""
              }`}
            >
              Time left: {formatTime(timeLeft)}
            </span>
          </div>
        )}
        {!isDecider && (
          <p className="text-purple-300">Waiting for category selection...</p>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded-lg mb-6 max-w-lg mx-auto">
          {error}
        </div>
      )}

      {isDecider ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full mx-auto">
          {categories.map((category, index) => {
            const colorMap = {
              blue: "from-blue-600 to-blue-400",
              purple: "from-purple-600 to-purple-400",
              pink: "from-pink-600 to-pink-400",
              green: "from-green-600 to-green-400",
              rose: "from-rose-600 to-rose-400",
              yellow: "from-yellow-500 to-yellow-300",
              red: "from-red-600 to-red-400",
              orange: "from-orange-600 to-orange-400",
            };
            const bgGradient =
              colorMap[category.color as keyof typeof colorMap] ||
              "from-blue-600 to-blue-400";
            return (
              <div key={category.id}>
                {" "}
                <Card
                  className={`p-6 cursor-pointer hover:scale-102 transition-all bg-slate-900/80 ${
                    selectedCategory === category.name
                      ? "border-2 border-white shadow-lg shadow-white/20"
                      : "border border-purple-300/20 hover:border-purple-300/40 hover:shadow-lg hover:shadow-purple-500/10"
                  }`}
                  onClick={() => handleSelectCategory(category.name)}
                >
                  {" "}
                  <div className="text-center">
                    {" "}
                    <div
                      className={`w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br ${bgGradient} flex items-center justify-center shadow-lg shadow-${category.color}-500/30 ring-2 ring-${category.color}-400/30`}
                    >
                      <span className="text-white text-3xl">
                        {category.emoji}
                      </span>
                    </div>{" "}
                    <h3 className="text-xl font-bold text-white bg-black/20 p-2 rounded-lg">
                      {category.name}
                    </h3>
                    <p className="text-xs mt-2 text-gray-300">
                      {category.description}
                    </p>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex justify-center">
          <Card className="p-8 text-center bg-slate-800 border border-purple-500/20 max-w-md">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin" />
            </div>
            <p className="text-xl text-purple-200">
              Waiting for {currentDecider?.nickname || "the decider"} to
              select...
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
