import { useState, useEffect } from "react";
import { Player, Scenario } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";
import { motion, AnimatePresence } from "framer-motion";
import { AcernityCard } from "@/components/ui/acernity/card";
import { GradientButton } from "@/components/ui/acernity/gradient-button";
import { Sparkles } from "@/components/ui/acernity/Sparkles";
import { GlowingText } from "@/components/ui/acernity/glowing-text";

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
  const { submitAnswer, startTimer, clearTimer, answers, processAIResponses } =
    useGameStore();
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

  // If there's no scenario yet, show a waiting state
  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-6"
        >
          <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin" />
        </motion.div>

        {currentDecider && (
          <AcernityCard className="mb-6 backdrop-blur-md border-purple-300/20 max-w-md">
            <div className="p-6 text-center">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl mb-2 text-white"
              >
                <span className="font-bold text-purple-300">
                  {currentDecider.nickname}
                </span>{" "}
                is choosing a scenario
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-gray-300"
              >
                Please wait while the decider selects a scenario for this
                round...
              </motion.p>
            </div>
          </AcernityCard>
        )}

        {!currentDecider && (
          <span className="text-lg text-purple-300">Loading scenario...</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        <Sparkles>
          <GlowingText className="text-3xl font-bold mb-6 text-center">
            Submit Your Answer
          </GlowingText>
        </Sparkles>

        {/* Enhanced Scenario Card */}
        <AcernityCard className="mb-8 backdrop-blur-md border-purple-400/30 shadow-lg shadow-purple-500/20">
          <div className="relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-blue-900/50 animate-gradient-slow" />

            {/* Scenario Content */}
            <div className="p-8 relative z-10">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center mb-3"
              >
                <div className="h-4 w-4 rounded-full bg-purple-500 mr-2 pulse-animation"></div>
                <h3 className="text-lg font-medium text-purple-300">
                  Scenario
                </h3>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900/70 backdrop-blur-md p-5 rounded-lg border border-purple-500/30 shadow-inner shadow-purple-600/10"
              >
                <p className="text-xl text-white font-medium leading-relaxed">
                  {scenario.scenario_text}
                </p>
              </motion.div>

              {currentTurn?.context && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 p-4 bg-blue-900/30 backdrop-blur-sm rounded-lg border border-blue-500/30"
                >
                  <div className="flex items-center mb-2">
                    <svg
                      className="w-5 h-5 text-blue-400 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium text-blue-300">Context</span>
                  </div>
                  <p className="text-blue-100">{currentTurn.context}</p>
                </motion.div>
              )}
            </div>
          </div>
        </AcernityCard>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded-lg mb-4"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur opacity-40 group-hover:opacity-70 transition duration-300"></div>
              <textarea
                className="relative w-full p-4 rounded-lg bg-slate-800/90 border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 focus:ring focus:ring-purple-500/20 transition-all mb-4"
                placeholder="Write your answer here..."
                rows={5}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={hasSubmitted || isSubmitting}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GradientButton
              onClick={handleSubmitAnswer}
              disabled={!answer.trim() || hasSubmitted || isSubmitting}
              className="w-full py-3 font-medium"
              fromColor="from-purple-600"
              toColor="to-blue-600"
            >
              {hasSubmitted ? (
                <>
                  <svg
                    className="w-5 h-5 mr-2 inline"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Answer Submitted
                </>
              ) : isSubmitting ? (
                <>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Submitting...
                  </motion.span>
                </>
              ) : (
                "Submit Answer"
              )}
            </GradientButton>
          </motion.div>

          <AnimatePresence>
            {hasSubmitted && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-green-400 mt-3"
              >
                Your answer has been submitted! Waiting for other players...
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {isDecider && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 p-4 bg-amber-800/20 border-l-4 border-amber-500 text-amber-300 rounded"
          >
            <p className="font-semibold">
              You're the decider for this turn, but you can still submit your
              own answer!
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 text-center"
        >
          <div className="inline-flex items-center px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-purple-500/20">
            <span className="text-purple-300">
              <span className="font-medium">
                {submissionCount().submittedCount}
              </span>
              <span className="text-gray-400"> / </span>
              <span>{submissionCount().expectedCount}</span>
              <span className="ml-2 text-gray-400">submissions</span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
