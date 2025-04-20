import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Player, Scenario } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";
import { Sparkles } from "@/components/ui/acernity/Sparkles";
import { GlowingText } from "@/components/ui/acernity/glowing-text";
import { AcernityCard } from "@/components/ui/acernity/card";
import { GradientButton } from "@/components/ui/acernity/gradient-button";
import AcernitySpotlight from "@/components/ui/acernity/spotlight";

interface ScenarioSelectionProps {
  turnId: string;
  userId: string;
  isDecider: boolean;
  category: string;
  currentDecider: Player | undefined;
}

export function ScenarioSelection({
  turnId,
  userId,
  isDecider,
  category,
  currentDecider,
}: ScenarioSelectionProps) {
  const { currentTurn } = useUserRoomStore();
  const { generateScenarios, selectScenario, currentScenario } = useGameStore();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [customScenario, setCustomScenario] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(40);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDecider && !scenarios.length) {
      handleGenerateScenarios();
    }
  }, [isDecider]);

  useEffect(() => {
    if (contentRef.current && scenarios.length > 0) {
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [scenarios]);

  useEffect(() => {
    if (!isDecider || currentScenario || !scenarios.length) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          if (scenarios.length > 0) {
            const randomIndex = Math.floor(Math.random() * scenarios.length);
            const randomScenario = scenarios[randomIndex];
            handleSelectScenario(randomScenario);
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDecider, currentScenario, scenarios]);

  useEffect(() => {
    if (scenarios.length > 0 && isDecider) {
      setTimeLeft(40);
    }
  }, [scenarios.length]);

  const handleGenerateScenarios = async () => {
    if (!isDecider) return;

    setIsGenerating(true);
    setError(null);

    try {
      const generatedScenarios = await generateScenarios(turnId);
      setScenarios(generatedScenarios);
    } catch (err) {
      console.error("Error generating scenarios:", err);
      setError("Failed to generate scenarios. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectScenario = async (
    scenario: Scenario | { customText: string }
  ) => {
    if (!isDecider) return;

    setIsLoading(true);
    setError(null);

    try {
      if ("id" in scenario) {
        await selectScenario(turnId, { id: scenario.id }, context, userId);
      } else {
        await selectScenario(
          turnId,
          { customText: scenario.customText },
          context,
          userId
        );
      }
    } catch (err) {
      console.error("Error selecting scenario:", err);
      setError("Failed to select scenario. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isDecider && !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Sparkles>
          <GlowingText className="text-2xl font-bold mb-6 text-white">
            {currentDecider?.nickname || "Decider"} is selecting a scenario...
          </GlowingText>
        </Sparkles>
        <AcernityCard className="border-purple-500/20 p-6 text-center max-w-lg w-full">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="flex flex-col items-center"
          >
            <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-300/30 rounded-full animate-spin mb-4" />
            <p className="text-xl text-purple-100 font-medium">
              Waiting for scenario selection...
            </p>
            <p className="text-sm text-purple-300 mt-2">Category: {category}</p>
          </motion.div>
        </AcernityCard>
      </div>
    );
  }

  return (
    <AcernitySpotlight className="flex flex-col items-center h-full overflow-y-auto py-8">
      <Sparkles>
        <GlowingText className="text-4xl font-extrabold mb-4 text-white">
          {isDecider ? "Select a Scenario" : `Selected Scenario (${category})`}
        </GlowingText>
      </Sparkles>

      {isDecider &&
        scenarios.length > 0 &&
        !isGenerating &&
        !currentScenario && (
          <motion.div
            className="mb-6"
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
            <span className="text-2xl font-bold bg-black/30 px-4 py-2 rounded-full text-white">
              Time remaining: {formatTime(timeLeft)}
            </span>
          </motion.div>
        )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-300 font-medium mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg max-w-3xl w-full"
        >
          {error}
        </motion.div>
      )}

      <div className="w-full max-w-3xl pb-16 px-4" ref={contentRef}>
        {isDecider ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <AcernityCard className="mb-6 border-purple-500/20">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-purple-100 mb-2">
                  Additional Context (Optional)
                </label>
                <textarea
                  className="w-full p-3 bg-slate-800/70 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Add any additional context for the scenario..."
                  rows={2}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={isGenerating ? "generating" : "scenarios"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-4 mb-6"
                >
                  {isGenerating ? (
                    <motion.div
                      animate={{
                        backgroundColor: [
                          "rgba(76, 29, 149, 0.1)",
                          "rgba(124, 58, 237, 0.2)",
                          "rgba(76, 29, 149, 0.1)",
                        ],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="p-6 rounded-lg flex items-center justify-center"
                    >
                      <div className="w-8 h-8 border-4 border-t-purple-500 border-purple-300/30 rounded-full animate-spin mr-3" />
                      <span className="text-purple-200 font-medium">
                        Generating scenarios...
                      </span>
                    </motion.div>
                  ) : (
                    <>
                      {scenarios.map((scenario, index) => (
                        <motion.button
                          key={scenario.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                          onClick={() => handleSelectScenario(scenario)}
                          disabled={isLoading}
                          className="p-4 bg-slate-800/70 border border-purple-500/30 rounded-lg hover:bg-purple-900/30 hover:border-purple-400/50 text-left transition-all duration-200 disabled:opacity-50 group"
                        >
                          <motion.span
                            className="text-white block text-lg font-semibold drop-shadow-md"
                            whileHover={{ x: 3 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 10,
                            }}
                          >
                            {scenario.scenario_text}
                          </motion.span>
                          {timeLeft <= 15 && (
                            <motion.div
                              className="w-full h-1 mt-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                              initial={{ width: "0%" }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 0.5 }}
                            />
                          )}
                        </motion.button>
                      ))}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <GradientButton
                onClick={handleGenerateScenarios}
                disabled={isGenerating || isLoading}
                className="w-full mb-6"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2" />
                    Generating...
                  </span>
                ) : (
                  "Generate New Scenarios"
                )}
              </GradientButton>
            </AcernityCard>

            <AcernityCard className="border-purple-500/20 sticky bottom-4">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-purple-100 mb-2">
                  Custom Scenario
                </label>
                <textarea
                  className="w-full p-3 bg-slate-800/70 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 mb-3"
                  value={customScenario}
                  onChange={(e) => setCustomScenario(e.target.value)}
                  placeholder="Write your own scenario..."
                  rows={3}
                />
                <GradientButton
                  onClick={() =>
                    handleSelectScenario({ customText: customScenario })
                  }
                  disabled={!customScenario.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2" />
                      Submitting...
                    </span>
                  ) : (
                    "Use Custom Scenario"
                  )}
                </GradientButton>
              </div>
            </AcernityCard>
          </motion.div>
        ) : (
          currentScenario && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-full"
            >
              <AcernityCard className="border-purple-400/20 p-6 bg-slate-800/80">
                <motion.p
                  className="text-2xl mb-4 text-white font-bold drop-shadow-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  {currentScenario.scenario_text}
                </motion.p>

                {currentTurn?.context && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="p-4 bg-slate-900/70 border border-purple-500/40 rounded-lg"
                  >
                    <p className="text-sm text-purple-100 font-medium">
                      <span className="font-semibold text-white">Context:</span>{" "}
                      {currentTurn.context}
                    </p>
                  </motion.div>
                )}
              </AcernityCard>
            </motion.div>
          )
        )}
      </div>
    </AcernitySpotlight>
  );
}
