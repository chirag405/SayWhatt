import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";

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
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-4">You've been disconnected</h1>
        <p className="text-gray-600 mb-6">
          You've lost connection to the game room. You can try to rejoin or
          return to the home screen.
        </p>
        <div className="flex flex-col space-y-3">
          <button
            onClick={handleRejoin}
            disabled={isReconnecting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {isReconnecting ? "Reconnecting..." : "Rejoin Game"}
          </button>
          <button
            onClick={handleReturnHome}
            className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
