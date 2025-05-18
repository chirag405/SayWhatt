import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Player, Scenario } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";
import Sparkles from "@/components/ui/Sparkles";
import { GlowingText } from "@/components/ui/glowing-text";
import { Card } from "@/components/ui/card";
import { GradientButton } from "@/components/ui/gradient-button";

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
  const [generationCount, setGenerationCount] = useState(0);
  useEffect(() => {
    if (isDecider && !scenarios.length) {
      handleGenerateScenarios();
    }
  }, [isDecider]);

  useEffect(() => {
    if (!isDecider || currentScenario || !scenarios.length) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          if (scenarios.length > 0) {
            // Choose from the most recent batch (last 4 scenarios)
            const recentScenarios = scenarios.slice(-4);
            const randomIndex = Math.floor(
              Math.random() * recentScenarios.length
            );
            const randomScenario = recentScenarios[randomIndex];
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

    // Check if we've already generated scenarios three times
    if (generationCount >= 3) {
      setError("You can only generate scenarios 3 times per turn.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const generatedScenarios = await generateScenarios(turnId);
      // Append new scenarios to existing ones instead of replacing
      setScenarios((prevScenarios) => [
        ...prevScenarios,
        ...generatedScenarios,
      ]);
      // Increment generation count
      setGenerationCount((prevCount) => prevCount + 1);
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
  // Enhanced waiting screen for non-deciders during scenario selection
  if (!isDecider && !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="text-center">
          <Sparkles>
            <GlowingText className="text-2xl md:text-3xl font-bold mb-4 text-white">
              {currentDecider?.nickname || "Decider"} is selecting a scenario...
            </GlowingText>
          </Sparkles>
        </div>
        <Card className="border border-purple-500/20 bg-slate-800 p-8 text-center max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-300/30 rounded-full animate-spin" />
            <div className="bg-purple-700/10 px-5 py-2 rounded-lg border border-purple-500/20">
              <span className="font-medium text-purple-200">Category:</span>
              <span className="ml-2 text-lg font-bold text-white">
                {category}
              </span>
            </div>
            <p className="text-base text-purple-100">
              Waiting for{" "}
              <span className="font-semibold text-white">
                {currentDecider?.nickname || "the decider"}
              </span>{" "}
              to choose a scenario.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full w-full overflow-hidden">
      <div className="w-full max-w-2xl px-2 md:px-4 flex flex-col items-center">
        <div className="text-center mb-4">
          <Sparkles>
            <GlowingText className="text-3xl md:text-4xl font-extrabold mb-4 text-white">
              {isDecider
                ? "Select a Scenario"
                : `Selected Scenario (${category})`}
            </GlowingText>
          </Sparkles>
        </div>

        {isDecider &&
          scenarios.length > 0 &&
          !isGenerating &&
          !currentScenario && (
            <div className="mb-4">
              <span className="text-lg font-semibold bg-black/30 px-4 py-2 rounded-full text-white border border-purple-500/20">
                Time left: {formatTime(timeLeft)}
              </span>
            </div>
          )}

        {error && (
          <div className="text-red-300 font-medium mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg w-full">
            {error}
          </div>
        )}

        <div
          className="w-full overflow-y-auto max-h-[70vh] pr-1 pb-8"
          style={{ scrollbarWidth: "thin" }}
        >
          {isDecider ? (
            <div className="w-full space-y-6">
              {/* Moved context field to be the first card when selecting a scenario */}
              <Card className="border border-indigo-500/30 bg-slate-800/90 p-5 relative">
                <div className="absolute -top-2 right-3 bg-indigo-600 px-2 py-0.5 rounded-md text-xs font-medium text-white">
                  Private
                </div>
                <label className="block text-sm font-semibold text-indigo-100 mb-2">
                  Additional Context (Private - only visible to you)
                </label>
                <textarea
                  className="w-full p-3 bg-slate-900/60 border border-indigo-500/30 rounded-md text-white placeholder-indigo-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-200"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Add private context for yourself about this scenario..."
                  rows={2}
                />
                <p className="mt-2 text-xs text-indigo-200/80">
                  This context will not be visible to other players and is for
                  your reference only.
                </p>
              </Card>

              <Card className="border border-purple-500/20 bg-slate-800 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-base font-semibold text-purple-100">
                    Scenario Options ({generationCount}/3 generations)
                  </span>
                  <GradientButton
                    onClick={handleGenerateScenarios}
                    disabled={isGenerating || isLoading || generationCount >= 3}
                    className="px-4 py-1.5 text-sm"
                  >
                    {isGenerating ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin mr-2" />
                        Generating...
                      </span>
                    ) : generationCount >= 3 ? (
                      "Limit Reached"
                    ) : scenarios.length ? (
                      "Generate More"
                    ) : (
                      "Generate"
                    )}
                  </GradientButton>
                </div>
                {isGenerating ? (
                  <div className="p-4 rounded-lg flex items-center justify-center bg-slate-900/60 border border-slate-700">
                    <div className="w-6 h-6 border-3 border-t-purple-500 border-purple-300/30 rounded-full animate-spin mr-3" />
                    <span className="text-purple-200">
                      Loading scenarios...
                    </span>
                  </div>
                ) : scenarios.length > 0 ? (
                  <div className="space-y-3">
                    {/* Show the 4 most recently generated scenarios */}
                    {scenarios.slice(-4).map((scenario, index) => (
                      <button
                        key={`scenario-${index}`}
                        onClick={() => handleSelectScenario(scenario)}
                        disabled={isLoading}
                        className="w-full p-4 bg-slate-900/70 border border-purple-500/30 rounded-lg text-left hover:bg-purple-900/30 hover:border-purple-400/50 transition-all duration-200 disabled:opacity-50"
                      >
                        <span className="text-white text-base font-medium">
                          {scenario.scenario_text}
                        </span>
                        {timeLeft <= 15 && (
                          <div className="mt-3 h-1 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700 text-center text-slate-300">
                    Click "Generate" to load scenario options ({generationCount}
                    /3 generations used)
                  </div>
                )}
              </Card>

              <Card className="border border-blue-500/20 bg-slate-800 p-5">
                <label className="block text-sm font-semibold text-blue-100 mb-2">
                  Custom Scenario
                </label>
                <textarea
                  className="w-full p-3 bg-slate-900/60 border border-blue-500/20 rounded-md text-white placeholder-blue-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 mb-3"
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
                  gradientFrom="from-blue-600"
                  gradientTo="to-indigo-600"
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
              </Card>
            </div>
          ) : currentScenario ? (
            <div className="w-full">
              <Card className="border border-purple-500/40 bg-slate-800 p-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center px-4 py-2 bg-purple-900/40 rounded-full border border-purple-500/40 mb-4">
                    <span className="text-purple-200 text-sm font-medium">
                      Category:
                    </span>
                    <span className="ml-2 text-white font-bold">
                      {category}
                    </span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 rounded-lg border border-purple-500/30">
                  <p className="text-2xl mb-4 text-white font-bold">
                    {currentScenario.scenario_text}
                  </p>
                </div>
                {currentTurn?.context && (
                  <div className="p-4 mt-4 bg-slate-900/70 border border-purple-500/40 rounded-lg">
                    <p className="text-sm text-purple-100">
                      <span className="font-semibold text-white">Context:</span>{" "}
                      {currentTurn.context}
                    </p>
                  </div>
                )}
              </Card>
            </div>
          ) : (
            // Show a waiting message when decider is selecting
            <div className="w-full">
              <Card className="border border-purple-500/40 bg-slate-800 p-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center px-4 py-2 bg-purple-900/40 rounded-full border border-purple-500/40 mb-4">
                    <span className="text-purple-200 text-sm font-medium">
                      Category:
                    </span>
                    <span className="ml-2 text-white font-bold">
                      {category}
                    </span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-8 rounded-lg border border-purple-500/30 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-300/30 rounded-full animate-spin mb-6"></div>
                  <p className="text-xl text-white font-bold mb-2">
                    {currentDecider?.nickname || "The Decider"} is selecting a
                    scenario...
                  </p>
                  <p className="text-purple-200 text-sm">
                    Please wait while they make their choice
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
