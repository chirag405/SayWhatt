// utils/useTabCloseHandler.ts
import { use, useEffect } from "react";
import { deletePlayer } from "@/actions/user";
import { useUserRoomStore } from "@/store/user-room-store";

// Improved useTabCloseHandler
export const useTabCloseHandler = (
  playerId: string | null,
  roomId: string | null
) => {
  const { resetState } = useUserRoomStore();

  useEffect(() => {
    if (!playerId || !roomId) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Use Beacon API for reliability
      const payload = JSON.stringify({ playerId });
      navigator.sendBeacon("/api/delete-player", payload);
    };

    // For handling network disconnections, you might want to add:
    const handleOffline = () => {
      const payload = JSON.stringify({ playerId });
      navigator.sendBeacon("/api/delete-player", payload);
      resetState();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    // window.addEventListener("pagehide", handleBeforeUnload);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("offline", handleOffline);
    };
  }, [playerId, roomId, resetState]);
};
