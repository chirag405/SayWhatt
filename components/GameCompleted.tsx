import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, User, Share2, Home } from "lucide-react";
import { Player } from "@/types/types";
import { motion } from "framer-motion";
import { Sparkles } from "@/components/ui/acernity/Sparkles";
import { GlowingText } from "@/components/ui/acernity/glowing-text";
import { AcernityCard } from "@/components/ui/acernity/card";
import { GradientButton } from "@/components/ui/acernity/gradient-button";
import { resetAllStores } from "@/store/store-util";

interface GameCompletedProps {
  players: Player[];
}

export function GameCompleted({ players }: GameCompletedProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Sort players by points
  const sortedPlayers = [...players].sort(
    (a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)
  );
  const winner = sortedPlayers[0];

  // Set up auto-reset timer (1 minute)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleResetAndReturn();
    }, 60000); // 60 seconds = 1 minute

    return () => {
      clearTimeout(timer); // Clean up timer on unmount
    };
  }, []);

  const handleShareResults = () => {
    const results = `Game Results:\n${sortedPlayers
      .map((p, i) => `${i + 1}. ${p.nickname}: ${p.total_points} points`)
      .join("\n")}`;

    navigator.clipboard.writeText(results);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetAndReturn = () => {
    // Reset all stores using the utility function
    resetAllStores();

    // Clear game data from localStorage
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentRoom");

    // Navigate to home
    router.push("/");
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto py-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="text-center mb-12">
        <Sparkles>
          <GlowingText className="text-4xl font-bold mb-2">
            Game Complete!
          </GlowingText>
        </Sparkles>
        <p className="text-purple-300 text-lg">Thanks for playing!</p>
      </motion.div>

      {/* Winner section */}
      <motion.div variants={item}>
        <AcernityCard className="p-6 mb-8 text-center border-yellow-400/30">
          <div className="flex justify-center mb-4">
            <motion.div
              className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full p-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Trophy className="w-12 h-12 text-white" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold mb-1 text-white">
            {winner.nickname} Wins!
          </h2>
          <p className="text-amber-400 font-semibold text-lg">
            {winner.total_points} points
          </p>
        </AcernityCard>
      </motion.div>

      {/* Players ranking */}
      <motion.div variants={item}>
        <AcernityCard className="mb-8 border-purple-500/20">
          <div className="p-4 border-b border-purple-500/10">
            <h3 className="font-semibold text-lg text-white">Final Rankings</h3>
          </div>
          <div className="divide-y divide-purple-500/10">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                className={`flex items-center p-4 ${index === 0 ? "bg-gradient-to-r from-amber-500/10 to-yellow-400/10" : ""}`}
                whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex-shrink-0 w-8 text-center font-bold text-gray-400">
                  {index + 1}
                </div>
                <div className="flex-shrink-0 mr-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index === 0
                        ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
                        : "bg-gradient-to-br from-purple-500/70 to-pink-500/70"
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{player.nickname}</p>
                </div>
                <div className="font-bold text-lg text-purple-300">
                  {player.total_points}
                </div>
              </motion.div>
            ))}
          </div>
        </AcernityCard>
      </motion.div>

      {/* Action buttons */}
      <motion.div variants={item} className="flex flex-col space-y-3">
        <GradientButton
          onClick={handleShareResults}
          className="w-full py-3 flex items-center justify-center"
          gradientFrom="from-blue-500"
          gradientTo="to-indigo-600"
        >
          <Share2 className="w-5 h-5 mr-2" />
          {copied ? "Copied!" : "Share Results"}
        </GradientButton>

        <GradientButton
          onClick={handleResetAndReturn}
          className="w-full py-3 flex items-center justify-center"
          gradientFrom="from-gray-600"
          gradientTo="to-gray-700"
          variant="secondary"
        >
          <Home className="w-5 h-5 mr-2" />
          Return to Home
        </GradientButton>
      </motion.div>
    </motion.div>
  );
}
