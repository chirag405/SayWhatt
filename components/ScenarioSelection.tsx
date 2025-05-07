import { useState, useEffect } from "react";
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

  // Enhanced waiting screen for non-deciders
  if (!isDecider && !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Sparkles>
          <GlowingText className="text-3xl font-bold mb-4 text-center text-white">
            {currentDecider?.nickname || "Decider"} is selecting a scenario...
          </GlowingText>
        </Sparkles>

        <AcernityCard className="border-purple-500/20 p-8 text-center max-w-lg w-full">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-t-purple-500 border-purple-300/30 rounded-full animate-spin mb-6" />

            <div className="bg-purple-500/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-purple-500/20">
              <span className="font-medium text-purple-200">Category:</span>
              <span className="ml-2 text-xl font-bold text-white">
                {category}
              </span>
            </div>

            <p className="text-lg text-purple-100">
              Please wait while {currentDecider?.nickname || "the decider"}{" "}
              chooses a scenario
            </p>
          </div>
        </AcernityCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-full w-full overflow-hidden">
      <div className="w-full max-w-3xl px-4 flex flex-col items-center">
        <Sparkles>
          <GlowingText className="text-4xl font-extrabold mb-4 text-white">
            {isDecider
              ? "Select a Scenario"
              : `Selected Scenario (${category})`}
          </GlowingText>
        </Sparkles>

        {isDecider &&
          scenarios.length > 0 &&
          !isGenerating &&
          !currentScenario && (
            <div className="mb-6">
              <span className="text-2xl font-bold bg-black/30 px-4 py-2 rounded-full text-white">
                Time remaining: {formatTime(timeLeft)}
              </span>
            </div>
          )}

        {error && (
          <div className="text-red-300 font-medium mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg max-w-3xl w-full">
            {error}
          </div>
        )}

        <div
          className="w-full overflow-y-auto max-h-[70vh] pr-2 pb-8"
          style={{ scrollbarWidth: "thin" }}
        >
          {isDecider ? (
            <div className="w-full">
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

                <div className="mb-6">
                  {isGenerating ? (
                    <div className="p-6 rounded-lg flex items-center justify-center bg-slate-800/50">
                      <div className="w-8 h-8 border-4 border-t-purple-500 border-purple-300/30 rounded-full animate-spin mr-3" />
                      <span className="text-purple-200 font-medium">
                        Generating scenarios...
                      </span>
                    </div>
                  ) : scenarios.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 w-full">
                      {scenarios.map((scenario, index) => (
                        <div key={`scenario-${index}`} className="w-full">
                          <button
                            onClick={() => handleSelectScenario(scenario)}
                            disabled={isLoading}
                            className="w-full p-4 bg-slate-800/70 border border-purple-500/30 rounded-lg hover:bg-purple-900/30 hover:border-purple-400/50 text-left transition-all duration-200 disabled:opacity-50"
                          >
                            <span className="text-white block text-lg font-semibold">
                              {scenario.scenario_text}
                            </span>
                            {timeLeft <= 15 && (
                              <div className="w-full h-1 mt-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

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
                  ) : scenarios.length ? (
                    "Generate New Scenarios"
                  ) : (
                    "Generate Scenarios"
                  )}
                </GradientButton>
              </AcernityCard>

              <AcernityCard className="border-purple-500/20 mb-8">
                <div>
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
            </div>
          ) : (
            currentScenario && (
              <div className="w-full">
                <AcernityCard className="border-purple-400/20 p-6 bg-slate-800/80">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center px-4 py-2 bg-purple-900/40 rounded-full border border-purple-500/40 mb-4">
                      <span className="text-purple-200 text-sm font-medium">
                        Category:{" "}
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
                        <span className="font-semibold text-white">
                          Context:
                        </span>{" "}
                        {currentTurn.context}
                      </p>
                    </div>
                  )}
                </AcernityCard>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
