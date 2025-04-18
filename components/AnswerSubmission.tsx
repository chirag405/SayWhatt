import { useState, useEffect } from "react";
import { Player, Scenario } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";

interface AnswerSubmissionProps {
  turnId: string;
  playerId: string;
  scenario: Scenario | null;
  timeLimit: number;
  timerEnd: Date | null;
  isDecider: boolean;
  currentDecider: Player | undefined;
}

export function AnswerSubmission({
  turnId,
  playerId,
  scenario,
  timeLimit,
  timerEnd,
  isDecider,
  currentDecider,
}: AnswerSubmissionProps) {
  const {
    submitAnswer,
    startTimer,
    clearTimer,
    answers,
    processAIResponses,
    nextTurn,
  } = useGameStore();
  const { currentTurn, roomPlayers } = useUserRoomStore();
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingNextPhase, setIsProcessingNextPhase] = useState(false);

  // Check if this player has already submitted an answer
  useEffect(() => {
    const userAnswer = answers.find(
      (a) => a.player_id === playerId && a.turn_id === turnId
    );
    if (userAnswer) {
      setHasSubmitted(true);
      setAnswer(userAnswer.answer_text);
    }
  }, [answers, playerId, turnId]);

  // Start timer when component mounts if not already started
  useEffect(() => {
    if (!timerEnd) {
      startTimer(timeLimit);
    }

    return () => {
      clearTimer();
    };
  }, []);

  // Fixed submission count function
  const submissionCount = () => {
    // Get all answers for this turn
    const currentTurnAnswers = answers.filter((a) => a.turn_id === turnId);

    // Get unique player IDs who have submitted answers for this turn
    const submittedPlayerIds = new Set(
      currentTurnAnswers.map((a) => a.player_id)
    );

    // Count of players who submitted answers
    const submittedCount = submittedPlayerIds.size;

    // For expected count, we need total players
    const expectedCount = roomPlayers.length;

    return { submittedCount, expectedCount };
  };

  // Check if timer has expired or all players have submitted
  useEffect(() => {
    const checkAndProgressGame = async () => {
      // Prevent multiple executions of this logic
      if (isProcessingNextPhase) return;

      const { submittedCount, expectedCount } = submissionCount();
      const allPlayersSubmitted = submittedCount >= expectedCount;
      const isTimerExpired = timerEnd ? new Date() > timerEnd : false;

      if ((allPlayersSubmitted || isTimerExpired) && !isProcessingNextPhase) {
        setIsProcessingNextPhase(true);
        console.log(
          "All players submitted or timer expired, progressing game..."
        );

        try {
          // Process AI responses for current answers
          await processAIResponses(turnId);

          // Don't immediately go to next turn
          // We're finished processing - the UI should now switch to voting phase
        } catch (error) {
          console.error("Error progressing game:", error);
          setError("Failed to progress game. Please try again.");
        } finally {
          setIsProcessingNextPhase(false);
        }
      }
    };

    // Run the check every 3 seconds
    const intervalId = setInterval(checkAndProgressGame, 3000);

    return () => clearInterval(intervalId);
  }, [
    answers,
    roomPlayers,
    timerEnd,
    turnId,
    isProcessingNextPhase,
    currentDecider,
  ]);

  const handleSubmitAnswer = async () => {
    // First check if player already has an answer submitted
    const existingAnswer = answers.find(
      (a) => a.player_id === playerId && a.turn_id === turnId
    );

    if (existingAnswer || hasSubmitted || !answer.trim()) {
      if (existingAnswer && !hasSubmitted) {
        setHasSubmitted(true);
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitAnswer(answer, turnId, playerId);
      setHasSubmitted(true);
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError("Failed to submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!scenario) {
    return <div className="text-center">Loading scenario...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-3xl">
        <h2 className="text-2xl font-bold mb-4">Submit Your Answer</h2>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <p className="text-xl mb-4">{scenario.scenario_text}</p>
          {currentTurn?.context && (
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Context:</span>{" "}
                {currentTurn.context}
              </p>
            </div>
          )}
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        <div className="w-full">
          <textarea
            className="w-full p-4 border border-gray-300 rounded-lg mb-4"
            placeholder="Write your answer here..."
            rows={5}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={hasSubmitted || isSubmitting}
          />

          <button
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || hasSubmitted || isSubmitting}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {hasSubmitted
              ? "Answer Submitted"
              : isSubmitting
                ? "Submitting..."
                : "Submit Answer"}
          </button>

          {hasSubmitted && (
            <p className="text-center text-green-600 mt-2">
              Your answer has been submitted! Waiting for other players...
            </p>
          )}
        </div>

        {isDecider && (
          <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-700 rounded">
            <p className="font-semibold">
              You're the decider for this turn, but you can still submit your
              own answer!
            </p>
          </div>
        )}
        <div className="mt-4 text-center text-gray-600">
          Submissions so far: {submissionCount().submittedCount} /{" "}
          {submissionCount().expectedCount}
        </div>
      </div>
    </div>
  );
}
