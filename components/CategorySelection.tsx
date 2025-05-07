import { useState, useEffect } from "react";
import { Player } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { motion } from "framer-motion";
import { AcernityCard } from "@/components/ui/acernity/card";
import { GradientButton } from "@/components/ui/acernity/gradient-button";
import { Sparkles } from "@/components/ui/acernity/Sparkles";
import { GlowingText } from "@/components/ui/acernity/glowing-text";
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
    { id: "relationship", name: "Relationship Drama", color: "rose" },
    { id: "chaos", name: "Hilarious Chaos", color: "yellow" },
    { id: "lifedeath", name: "Life-or-Death Dilemmas", color: "red" },
    { id: "embarrassing", name: "Embarrassing Moments", color: "orange" },
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles>
            <GlowingText className="text-2xl font-bold mb-6">
              Category selected: {currentCategory}
            </GlowingText>
          </Sparkles>

          <AcernityCard className="p-6 text-center backdrop-blur-md border-purple-300/20">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-purple-200"
            >
              {currentStatus === "selecting_scenario"
                ? "Waiting for scenario selection..."
                : "Moving to next phase..."}
            </motion.p>

            <motion.div
              className="mt-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-8 h-8 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin mx-auto" />
            </motion.div>
          </AcernityCard>
        </motion.div>
      </div>
    );
  }

  // If our local UI thinks we've selected but we haven't gotten confirmation
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Sparkles>
            <GlowingText className="text-2xl font-bold mb-6">
              Processing category selection...
            </GlowingText>
          </Sparkles>

          <AcernityCard className="p-6 text-center backdrop-blur-md border-purple-300/20">
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-lg text-purple-200"
            >
              Updating game state...
            </motion.p>

            <motion.div
              className="mt-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-8 h-8 border-4 border-t-purple-500 border-purple-300 rounded-full mx-auto" />
            </motion.div>
          </AcernityCard>
        </motion.div>
      </div>
    );
  }

  // Default view - selecting a category
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Sparkles>
          <GlowingText className="text-3xl font-bold mb-2">
            {isDecider
              ? "Select a Category"
              : `${currentDecider?.nickname || "Decider"} is selecting a category`}
          </GlowingText>
        </Sparkles>

        {/* Timer display - more prominent */}
        {isDecider && (
          <motion.div
            className="mb-4"
            animate={{
              scale: timeLeft <= 10 ? [1, 1.1, 1] : 1,
              color:
                timeLeft <= 10 ? ["#ff6b6b", "#ff0000", "#ff6b6b"] : "#a78bfa",
            }}
            transition={{
              duration: 0.8,
              repeat: timeLeft <= 10 ? Infinity : 0,
            }}
          >
            <span className="text-2xl font-bold bg-black/30 px-4 py-2 rounded-full">
              Time remaining: {formatTime(timeLeft)}
            </span>
          </motion.div>
        )}

        {!isDecider && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-purple-300"
          >
            Waiting for category selection...
          </motion.p>
        )}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded-lg mb-6 max-w-lg mx-auto"
        >
          {error}
        </motion.div>
      )}

      {isDecider ? (
        <motion.div
          className="grid grid-cols-2 gap-4 max-w-2xl mx-auto"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          initial="hidden"
          animate="show"
        >
          {categories.map((category, index) => {
            const colorMap = {
              blue: "from-blue-600 to-blue-400",
              purple: "from-purple-600 to-purple-400",
              pink: "from-pink-600 to-pink-400",
              green: "from-green-600 to-green-400",
            };

            const bgGradient =
              colorMap[category.color as keyof typeof colorMap] ||
              "from-blue-600 to-blue-400";

            return (
              <motion.div
                key={category.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <AcernityCard
                  className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                    selectedCategory === category.name
                      ? "border-2 border-white"
                      : "border-purple-300/20"
                  }`}
                  onClick={() => handleSelectCategory(category.name)}
                >
                  <div className="text-center">
                    <div
                      className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br ${bgGradient} flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-xl">
                        {category.name[0]}
                      </span>
                    </div>
                    {/* Improved category name display */}
                    <h3 className="text-xl font-bold text-white bg-black/20 p-2 rounded-lg">
                      {category.name}
                    </h3>
                  </div>
                </AcernityCard>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="flex justify-center">
          <AcernityCard className="p-8 text-center backdrop-blur-md border-purple-300/20 max-w-md">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex justify-center mb-4"
            >
              <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin" />
            </motion.div>
            <p className="text-xl text-purple-200">
              Waiting for {currentDecider?.nickname || "the decider"} to
              select...
            </p>
          </AcernityCard>
        </div>
      )}
    </div>
  );
}
