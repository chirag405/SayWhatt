import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { ThumbsUp, Clock, ChevronLeft, ChevronRight } from "lucide-react";

import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";
import { AcernityCard } from "@/components/ui/acernity/card";
import { GradientButton } from "@/components/ui/acernity/gradient-button";
import { Sparkles } from "@/components/ui/acernity/Sparkles";
import { GlowingText } from "@/components/ui/acernity/glowing-text";

interface VotingPhaseProps {
  turnId: string;
  currentUserId: string;
  isDecider: boolean;
}

export function VotingPhase({
  turnId,
  currentUserId,
  isDecider,
}: VotingPhaseProps) {
  const { answers, votes, submitVote, processAfterVoting } = useGameStore();
  const { currentRoom, currentUser, roomPlayers } = useUserRoomStore();
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds per slide
  const [turnData, setTurnData] = useState<{
    remaining_deciders: number;
  } | null>(null);
  const isHost = currentUser?.is_host ?? false;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const turnAnswers = answers.filter((a) => a.turn_id === turnId);
  const supabase = createClient();

  // Timer for automatic slideshow
  useEffect(() => {
    if (!isHost) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Clear the timer first
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          if (currentAnswerIndex < turnAnswers.length - 1) {
            handleNext();
            return 10; // Reset to 10 seconds for next slide
          } else {
            // Last slide finished, proceed to next turn
            setTimeout(() => {
              handleFinishVoting();
            }, 500);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentAnswerIndex, turnAnswers.length, isHost]);

  useEffect(() => {
    const channelName = `voting-slides:${turnId}`;

    // Create and subscribe to channel
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "slide-change" }, (payload) => {
        console.log(`Received slide change event:`, payload);
        setCurrentAnswerIndex(payload.payload.slideIndex);
        setTimeLeft(10); // Reset timer when slide changes
      })
      .subscribe((status) => {
        console.log(`Channel ${channelName} subscription status:`, status);
      });

    return () => {
      console.log(`Unsubscribing from channel ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [turnId, supabase]);

  // Track votes
  useEffect(() => {
    const userVotes = votes.filter((v) => v.voter_id === currentUserId);
    const votedAnswers: Record<string, boolean> = {};

    userVotes.forEach((vote) => {
      votedAnswers[vote.answer_id] = true;
    });

    setHasVoted(votedAnswers);
  }, [votes, currentUserId]);

  // Debug logging for host status
  useEffect(() => {
    console.log("Is host:", isHost);
    console.log("Current user:", currentUser);
  }, [isHost, currentUser]);

  const handleVote = async (answerId: string) => {
    if (hasVoted[answerId]) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await submitVote(answerId, currentUserId);
      if (result.success) {
        setHasVoted((prev) => ({ ...prev, [answerId]: true }));
      } else {
        setError("Failed to submit vote. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting vote:", err);
      setError("An error occurred while voting.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentAnswerIndex < turnAnswers.length - 1) {
      const newIndex = currentAnswerIndex + 1;
      setCurrentAnswerIndex(newIndex);
      setTimeLeft(10); // Reset timer

      // Broadcast slide change to all clients
      if (isHost) {
        const channelName = `voting-slides:${turnId}`;
        console.log(`Broadcasting slide change to ${channelName}:`, newIndex);
        supabase
          .channel(channelName)
          .send({
            type: "broadcast",
            event: "slide-change",
            payload: { slideIndex: newIndex },
          })
          .then(() => console.log("Broadcast sent successfully"))
          .catch((err) =>
            console.error("Error broadcasting slide change:", err)
          );
      }
    }
  };

  const handlePrevious = () => {
    if (currentAnswerIndex > 0) {
      const newIndex = currentAnswerIndex - 1;
      setCurrentAnswerIndex(newIndex);
      setTimeLeft(10); // Reset timer

      // Broadcast slide change to all clients
      if (isHost) {
        supabase
          .channel(`voting-slides:${turnId}`)
          .send({
            type: "broadcast",
            event: "slide-change",
            payload: { slideIndex: newIndex },
          })
          .then(() => console.log("Broadcast sent successfully"))
          .catch((err) =>
            console.error("Error broadcasting slide change:", err)
          );
      }
    }
  };

  const handleFinishVoting = async () => {
    if (!isHost) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(
        "Finishing voting phase for room:",
        currentRoom!.id,
        "current turn:",
        currentRoom?.current_turn
      );

      // Call our function that properly handles determining
      // if we need to go to the next turn or next round
      const result = await processAfterVoting(currentRoom!.id);

      if (!result) {
        setError("Failed to proceed. Please try again.");
      }
    } catch (err) {
      console.error("Error proceeding after voting:", err);
      setError("An error occurred while trying to proceed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (turnAnswers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-16 h-16 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  const currentAnswer = turnAnswers[currentAnswerIndex];
  const votesForCurrentAnswer = votes.filter(
    (v) => v.answer_id === currentAnswer.id
  ).length;

  // Determine if this is the last turn in the round
  const isLastTurn = currentRoom?.current_turn === roomPlayers.length;

  // Text for the continue button
  const continueButtonText = isLoading
    ? "Processing..."
    : isLastTurn
      ? `Continue to Next Round (${timeLeft}s)`
      : `Continue to Next Turn (${timeLeft}s)`;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Sparkles>
        <GlowingText className="text-2xl font-bold mb-6">
          Voting Phase
        </GlowingText>
      </Sparkles>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 bg-red-900/20 px-4 py-2 rounded-lg mb-4 border border-red-700/30"
        >
          {error}
        </motion.div>
      )}

      <div className="w-full max-w-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAnswer.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <AcernityCard className="p-6 mb-6 border-purple-500/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Answer {currentAnswerIndex + 1} of {turnAnswers.length}
                </h3>
                <div className="flex items-center text-sm font-medium text-purple-300">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{timeLeft}s</span>
                </div>
              </div>

              <p className="text-xl mb-4 text-white">
                {currentAnswer.answer_text}
              </p>

              {/* AI Response display */}
              {currentAnswer.ai_response && (
                <div className="bg-slate-700/50 p-4 rounded-md mb-4 border border-purple-500/20">
                  <p className="text-sm text-purple-300 italic mb-1">
                    AI Feedback:
                  </p>
                  <p className="text-gray-200">{currentAnswer.ai_response}</p>
                </div>
              )}

              {/* Vote count display */}
              <div className="mb-4 text-center">
                <span className="text-purple-300">
                  {votesForCurrentAnswer}{" "}
                  {votesForCurrentAnswer === 1 ? "vote" : "votes"}
                </span>
              </div>

              <div className="flex justify-center space-x-4 mt-6">
                <motion.button
                  onClick={() => handleVote(currentAnswer.id)}
                  disabled={hasVoted[currentAnswer.id] || isLoading}
                  className={`px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 ${
                    hasVoted[currentAnswer.id]
                      ? "bg-gradient-to-r from-purple-500 to-purple-600"
                      : ""
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center">
                    <ThumbsUp className="w-5 h-5 mr-2" />
                    {hasVoted[currentAnswer.id] ? "Voted" : "Upvote"}
                  </div>
                </motion.button>
              </div>
            </AcernityCard>
          </motion.div>
        </AnimatePresence>

        {/* Navigation controls */}
        <div className="flex justify-between mt-4">
          {/* Fixed Previous button - disables only if at first slide or not host */}
          <motion.button
            onClick={handlePrevious}
            disabled={!isHost || currentAnswerIndex === 0}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
              isHost && currentAnswerIndex > 0
                ? "bg-slate-700/50 border border-purple-500/20 hover:bg-slate-600/50"
                : "bg-slate-800/30 border border-purple-500/10 opacity-50 cursor-not-allowed"
            }`}
            whileHover={isHost && currentAnswerIndex > 0 ? { scale: 1.05 } : {}}
            whileTap={isHost && currentAnswerIndex > 0 ? { scale: 0.95 } : {}}
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Previous
          </motion.button>

          <div className="flex items-center text-purple-300">
            <span className="px-3 py-1 bg-slate-700/50 rounded-lg border border-purple-500/20">
              {currentAnswerIndex + 1} / {turnAnswers.length}
            </span>
          </div>

          {/* Fixed Next button - disables only if at last slide or not host */}
          <motion.button
            onClick={handleNext}
            disabled={!isHost || currentAnswerIndex === turnAnswers.length - 1}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
              isHost && currentAnswerIndex < turnAnswers.length - 1
                ? "bg-slate-700/50 border border-purple-500/20 hover:bg-slate-600/50"
                : "bg-slate-800/30 border border-purple-500/10 opacity-50 cursor-not-allowed"
            }`}
            whileHover={
              isHost && currentAnswerIndex < turnAnswers.length - 1
                ? { scale: 1.05 }
                : {}
            }
            whileTap={
              isHost && currentAnswerIndex < turnAnswers.length - 1
                ? { scale: 0.95 }
                : {}
            }
          >
            Next <ChevronRight className="w-5 h-5 ml-1" />
          </motion.button>
        </div>

        {/* Continue button for host */}
        {isHost && (
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GradientButton
              onClick={handleFinishVoting}
              disabled={
                isLoading || currentAnswerIndex !== turnAnswers.length - 1
              }
              className={`px-6 py-3 ${
                currentAnswerIndex !== turnAnswers.length - 1
                  ? "opacity-50"
                  : ""
              }`}
              gradientFrom="from-blue-500"
              gradientTo="to-purple-600"
            >
              {continueButtonText}
            </GradientButton>
          </motion.div>
        )}
      </div>
    </div>
  );
}
