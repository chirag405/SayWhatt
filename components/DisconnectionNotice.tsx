import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AcernityCard } from "@/components/ui/acernity/card";
import { GradientButton } from "@/components/ui/acernity/gradient-button";
import { Sparkles } from "@/components/ui/acernity/Sparkles";
import { GlowingText } from "@/components/ui/acernity/glowing-text";

interface DisconnectionNoticeProps {
  roomCode: string;
}

export function DisconnectionNotice({ roomCode }: DisconnectionNoticeProps) {
  const router = useRouter();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleRejoin = async () => {
    try {
      setIsReconnecting(true);
      // Clear localStorage to ensure a fresh reconnection
      localStorage.removeItem("currentUser");
      localStorage.removeItem("currentRoom");

      // Redirect to room entry page with the room code
      router.push(`/join?code=${roomCode}`);
    } catch (error) {
      console.error("Failed to rejoin room:", error);
      setIsReconnecting(false);
    }
  };

  const handleReturnHome = () => {
    // Clear all game-related data
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentRoom");
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AcernityCard className="p-8 max-w-md border-red-200/20">
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </motion.div>
          </div>

          <Sparkles>
            <GlowingText className="text-2xl font-bold text-center mb-4">
              You've been disconnected
            </GlowingText>
          </Sparkles>

          <p className="text-gray-300 mb-6 text-center">
            You've lost connection to the game room. You can try to rejoin or
            return to the home screen.
          </p>

          <div className="flex flex-col space-y-3">
            <GradientButton
              onClick={handleRejoin}
              disabled={isReconnecting}
              className="w-full py-3 font-medium"
              gradientFrom="from-blue-600"
              gradientTo="to-indigo-600"
            >
              {isReconnecting ? (
                <>
                  <span className="mr-2">Reconnecting</span>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ...
                  </motion.span>
                </>
              ) : (
                "Rejoin Game"
              )}
            </GradientButton>

            <GradientButton
              onClick={handleReturnHome}
              className="w-full py-3 font-medium"
              variant="secondary"
              fromColor="from-slate-700"
              toColor="to-slate-600"
            >
              Return to Home
            </GradientButton>
          </div>
        </AcernityCard>
      </motion.div>
    </div>
  );
}
