import { useState, useEffect } from "react";

import { Player, Scenario } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";

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

  useEffect(() => {
    if (isDecider && !scenarios.length) {
      handleGenerateScenarios();
    }
  }, [isDecider]);

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

  if (!isDecider && !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold mb-6">
          {currentDecider?.nickname || "Decider"} is selecting a scenario...
        </h2>
        <div className="p-6 bg-gray-100 rounded-lg shadow-md">
          <p className="text-xl animate-pulse">
            Waiting for scenario selection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold mb-6">
        {isDecider ? "Select a Scenario" : `Selected Scenario (${category})`}
      </h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isDecider ? (
        <>
          <div className="w-full max-w-3xl mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Context (Optional)
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-lg"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Add any additional context for the scenario..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6">
              {isGenerating ? (
                <div className="p-4 bg-gray-100 rounded-lg animate-pulse">
                  Generating scenarios...
                </div>
              ) : (
                scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => handleSelectScenario(scenario)}
                    disabled={isLoading}
                    className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 text-left transition-colors duration-200 disabled:opacity-50"
                  >
                    {scenario.scenario_text}
                  </button>
                ))
              )}

              <button
                onClick={handleGenerateScenarios}
                disabled={isGenerating || isLoading}
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                Generate New Scenarios
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Scenario
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-lg mb-2"
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                placeholder="Write your own scenario..."
                rows={3}
              />
              <button
                onClick={() =>
                  handleSelectScenario({ customText: customScenario })
                }
                disabled={!customScenario.trim() || isLoading}
                className="w-full p-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                Use Custom Scenario
              </button>
            </div>
          </div>
        </>
      ) : (
        currentScenario && (
          <div className="w-full max-w-3xl bg-white p-6 rounded-lg shadow-md">
            <p className="text-xl mb-4">{currentScenario.scenario_text}</p>
            {currentTurn?.context && (
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Context:</span>{" "}
                  {currentTurn.context}
                </p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
