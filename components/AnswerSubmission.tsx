import { useState, useEffect } from "react";
import { Player, Scenario } from "@/types/types";
import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";
import { motion, AnimatePresence } from "framer-motion";

import { GradientButton } from "@/components/ui/gradient-button";
import Sparkles from "@/components/ui/Sparkles";
import { GlowingText } from "@/components/ui/glowing-text";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Card } from "./ui/card";
import {
  Brain,
  Clock,
  CheckCircle2,
  AlertCircle,
  SendHorizonal,
} from "lucide-react";
import { playSound, SOUND_PATHS } from "@/utils/soundUtils"; // Add this line

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
  const [showAIProcessing, setShowAIProcessing] = useState(false);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Basic filtering: Don't play for modifier keys or navigation keys if desired,
    // but for simplicity, we'll play on most keydowns for now.
    // The sound category toggle and master volume will provide user control.
    // A more advanced implementation could check event.key for specific characters.
    if (!event.ctrlKey && !event.altKey && !event.metaKey) {
      playSound(SOUND_PATHS.typingKeypress, "typing");
    }
  };

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
        setShowAIProcessing(true);
        console.log(
          "All players submitted or timer expired, progressing game..."
        );

        // Clear the timer when all players have submitted their answers
        if (allPlayersSubmitted && !isTimerExpired) {
          clearTimer();
        }

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

  // If we're showing the AI processing screen
  if (showAIProcessing) {
    return (
      <div className="flex items-center justify-center h-full flex-1">
        <div className="bg-slate-900/70 border border-purple-500/20 rounded-xl p-6 md:p-8 w-full max-w-lg text-center">
          <div className="mx-auto mb-8 relative">
            <div className="absolute -inset-10 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full blur-3xl"></div>
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center relative z-10 mx-auto">
              <Brain className="w-12 h-12 text-white" />
            </div>
          </div>

          <Sparkles>
            <div className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300">
              Reviewing Answers
            </div>
          </Sparkles>

          <p className="text-purple-200 mb-8 max-w-md mx-auto">
            The MethHead is reviewing the answers...
          </p>

          <div className="flex justify-center space-x-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If there's no scenario yet, show a waiting state
  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full flex-1">
        <div className="text-center mb-4">
          <Sparkles>
            <GlowingText className="text-2xl md:text-3xl font-bold text-white">
              Waiting for scenario...
            </GlowingText>
          </Sparkles>
        </div>
        <div className="flex flex-col items-center bg-slate-900/40 border border-purple-500/20 rounded-xl p-6">
          <div className="w-12 h-12 border-4 border-t-purple-500 border-purple-300/30 rounded-full animate-spin mx-auto mb-4" />
          <span className="text-lg text-purple-300">
            Waiting for the decider to select a scenario.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-6 md:p-8 h-full flex flex-col">
        <div className="h-full flex flex-col">
          <div className="mb-6">
            <Sparkles>
              <GlowingText className="text-2xl md:text-3xl font-bold text-center mb-2">
                Submit Your Answer
              </GlowingText>
            </Sparkles>
            <div className="flex items-center justify-between mt-2 mb-4">
              <div className="inline-flex items-center px-4 py-1 bg-slate-800/60 rounded-full border border-purple-500/20 text-purple-300 text-sm">
                <span className="font-medium">
                  {submissionCount().submittedCount}
                </span>
                <span className="text-gray-400"> / </span>
                <span>{submissionCount().expectedCount}</span>
                <span className="ml-2 text-gray-400">submitted</span>
              </div>
              <div className="inline-flex items-center px-3 py-1 bg-black/30 rounded-full border border-purple-500/20 text-white text-sm">
                <Clock className="w-4 h-4 mr-1 text-purple-300" />
                {timerEnd
                  ? Math.max(
                      0,
                      Math.floor((timerEnd.getTime() - Date.now()) / 1000)
                    ) + "s"
                  : timeLimit + "s"}
              </div>
            </div>
          </div>

          {/* Scenario Card */}
          <div className="mb-6">
            <div className="bg-slate-900/70 p-5 rounded-lg border border-purple-500/30 shadow-lg">
              <h3 className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-300 mb-2">
                Scenario
              </h3>
              <p className="text-xl text-white font-medium leading-relaxed">
                {scenario.scenario_text}
              </p>
              {currentTurn?.context && (
                <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
                  <span className="font-medium text-blue-300">Context:</span>
                  <span className="ml-2 text-blue-100">
                    {currentTurn.context}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Answer Input */}
          <div className="flex-1">
            <div className="relative group h-full flex flex-col">
              <textarea
                className="relative w-full h-full min-h-[120px] p-4 rounded-lg bg-slate-800/90 border border-purple-500/30 text-white text-lg placeholder-gray-400 placeholder:text-lg focus:border-purple-400 focus:outline-none transition-all resize-none mb-4 font-special-elite"
                placeholder="Write your creative answer here..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown} // Add this line
                disabled={hasSubmitted || isSubmitting}
              />
              <div className="flex flex-col gap-2">
                <GradientButton
                  onClick={handleSubmitAnswer}
                  disabled={!answer.trim() || hasSubmitted || isSubmitting}
                  className="w-full py-3 font-medium flex items-center justify-center gap-2"
                  gradientFrom="from-purple-600"
                  gradientTo="to-blue-600"
                >
                  {hasSubmitted ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Answer Submitted</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-3 border-t-white border-white/30 rounded-full animate-spin" />
                      <span className="animate-pulse">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="w-5 h-5" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </GradientButton>
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded-lg mt-2 flex items-center gap-2"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                  {hasSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-2"
                    >
                      <div className="bg-green-900/20 border border-green-500/30 text-green-300 p-3 rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <p>
                          Your answer has been submitted! Waiting for other
                          players...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
