import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import {
  ThumbsUp,
  ThumbsDown,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useGameStore } from "@/store/game-store";
import { useUserRoomStore } from "@/store/user-room-store";
import { Card } from "@/components/ui/card";
import { GradientButton } from "@/components/ui//gradient-button";
import Sparkles from "@/components/ui/Sparkles";
import { GlowingText } from "@/components/ui/glowing-text";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { playSound, SOUND_PATHS } from "@/utils/soundUtils";

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
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per slide
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
            return 30; // Reset to 30 seconds for next slide
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
        setTimeLeft(30); // Reset timer to 30 seconds when slide changes
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

  // Add the effect to listen for vote events for sound playback
  useEffect(() => {
    const voteChannel = supabase.channel(`vote-sounds:${turnId}`);

    voteChannel
      .on("broadcast", { event: "vote-cast" }, (payload) => {
        // Play the appropriate vote sound based on the vote type
        if (payload.payload.voterId !== currentUserId) {
          if (payload.payload.voteType === "up") {
            // Ensure we respect sound settings
            playSound(SOUND_PATHS.voteUp, "voting");
          } else if (payload.payload.voteType === "down") {
            // Ensure we respect sound settings
            playSound(SOUND_PATHS.voteDown, "voting");
          }
        }
      })
      .subscribe((status) => {
        console.log(`Vote sound channel status: ${status}`);
      });

    return () => {
      supabase.removeChannel(voteChannel);
    };
  }, [turnId]);
  const handleVote = async (
    answerId: string,
    voteType: "up" | "down" = "up"
  ) => {
    if (hasVoted[answerId]) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await submitVote(answerId, currentUserId, voteType);
      if (result.success) {
        setHasVoted((prev) => ({ ...prev, [answerId]: true }));

        // Play vote sound locally based on vote type
        playSound(
          voteType === "up" ? SOUND_PATHS.voteUp : SOUND_PATHS.voteDown,
          "voting"
        );

        // Broadcast vote to all clients for synchronized sound playback
        supabase
          .channel(`vote-sounds:${turnId}`)
          .send({
            type: "broadcast",
            event: "vote-cast",
            payload: { voteType, voterId: currentUserId },
          })
          .then(() => console.log(`${voteType} vote sound broadcast sent`))
          .catch((err) => console.error("Error broadcasting vote sound:", err));
      } else {
        setError("Failed to submit vote");
      }
    } catch (err) {
      console.error("Error submitting vote:", err);
      setError("An error occurred while voting");
    } finally {
      setIsLoading(false);
    }
  };
  const handleNext = () => {
    if (currentAnswerIndex < turnAnswers.length - 1) {
      const newIndex = currentAnswerIndex + 1;
      setCurrentAnswerIndex(newIndex);
      setTimeLeft(30); // Reset timer to 30 seconds

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

  // Remove the handlePrevious function as we don't need it anymore

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
      } else {
        // Play transition sound
        playSound(SOUND_PATHS.transition, "results");
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
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-lg p-8 text-center">
          <div className="w-16 h-16 border-4 border-t-purple-500 border-purple-300 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-xl text-purple-200">Loading answers...</p>
        </div>
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
    <div className="flex flex-col items-center justify-center h-full w-full px-2 md:px-4">
      <div className="text-center mb-4">
        <Sparkles>
          <GlowingText className="text-2xl md:text-3xl font-bold">
            Voting Phase
          </GlowingText>
        </Sparkles>
      </div>

      {error && (
        <div className="text-red-400 bg-red-900/20 px-4 py-2 rounded-lg mb-4 border border-red-700/30 max-w-lg w-full text-center">
          {error}
        </div>
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
            <Card className="p-6 mb-6 border border-purple-500/30 bg-slate-900/80 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Answer {currentAnswerIndex + 1} of {turnAnswers.length}
                </h3>
                <div className="flex items-center px-3 py-1 bg-black/30 rounded-full border border-purple-500/20 text-white text-sm">
                  <Clock className="w-4 h-4 mr-1 text-purple-300" />
                  <span>{timeLeft}s</span>
                </div>
              </div>
              <div className="bg-slate-800/50 p-5 rounded-md border border-purple-500/20 mb-4">
                <p className="text-xl mb-4 text-white">
                  {currentAnswer.answer_text}
                </p>
              </div>{" "}
              {/* AI Response display with TypeWriter Effect */}
              {currentAnswer.ai_response && (
                <div className="bg-purple-900/20 p-4 rounded-md mb-4 border border-purple-500/20">
                  <p className="text-sm text-purple-300 italic mb-1">
                    AI Feedback:
                  </p>
                  <TextGenerateEffect
                    words={currentAnswer.ai_response}
                    duration={0.8} // Slightly slower animation for better readability
                    className="text-gray-200"
                  />
                </div>
              )}
              {/* Vote count display */}
              <div className="mb-4 text-center">
                <span className="text-purple-300 px-4 py-1 bg-slate-800/50 rounded-full border border-purple-500/20 text-sm font-medium">
                  {votesForCurrentAnswer}{" "}
                  {votesForCurrentAnswer === 1 ? "vote" : "votes"}
                </span>
              </div>
              <div className="flex justify-center space-x-4 mt-6">
                <button
                  onClick={() => handleVote(currentAnswer.id, "up")}
                  disabled={hasVoted[currentAnswer.id] || isLoading}
                  className={`px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 hover:brightness-110 active:scale-95 ${
                    hasVoted[currentAnswer.id]
                      ? "bg-gradient-to-r from-purple-500 to-purple-600"
                      : ""
                  }`}
                >
                  <div className="flex items-center">
                    <ThumbsUp className="w-5 h-5 mr-2" />
                    {hasVoted[currentAnswer.id] ? "Voted" : "Upvote"}
                  </div>
                </button>

                <button
                  onClick={() => handleVote(currentAnswer.id, "down")}
                  disabled={hasVoted[currentAnswer.id] || isLoading}
                  className={`px-6 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 hover:brightness-110 active:scale-95 ${
                    hasVoted[currentAnswer.id]
                      ? "bg-gradient-to-r from-purple-500 to-purple-600"
                      : ""
                  }`}
                >
                  <div className="flex items-center">
                    <ThumbsDown className="w-5 h-5 mr-2" />
                    {hasVoted[currentAnswer.id] ? "Voted" : "Downvote"}
                  </div>
                </button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>{" "}
        {/* Navigation controls */}
        <div className="flex justify-center items-center mt-4 gap-2">
          <div className="flex items-center">
            <span className="px-3 py-1 bg-slate-700/50 rounded-lg border border-purple-500/20 text-purple-300 font-medium">
              {currentAnswerIndex + 1} / {turnAnswers.length}
            </span>
          </div>

          {isHost && (
            <button
              onClick={handleNext}
              disabled={currentAnswerIndex === turnAnswers.length - 1}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ml-4 ${
                currentAnswerIndex < turnAnswers.length - 1
                  ? "bg-slate-700/50 border border-purple-500/20 hover:bg-slate-600/50 text-white"
                  : "bg-slate-800/30 border border-purple-500/10 opacity-50 cursor-not-allowed text-slate-400"
              }`}
            >
              Next <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          )}
        </div>
        {/* Continue button for host */}
        {isHost && (
          <div className="mt-8 text-center">
            <button
              onClick={handleFinishVoting}
              disabled={
                isLoading || currentAnswerIndex !== turnAnswers.length - 1
              }
              className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100 ${
                currentAnswerIndex !== turnAnswers.length - 1
                  ? "opacity-50"
                  : ""
              }`}
            >
              {continueButtonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
