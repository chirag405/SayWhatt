// utils/useTabCloseHandler.ts
import { use, useEffect } from "react";
import { deletePlayer } from "@/actions/user";
import { useUserRoomStore } from "@/store/user-room-store";

export const useTabCloseHandler = (
  playerId: string | null,
  roomId: string | null
) => {
  useEffect(() => {
    if (!playerId || !roomId) return;

    const cleanup = async () => {
      try {
        const { success, error } = await deletePlayer(playerId);
        console.log("Player deleted on tab close/reload");
      } catch (error) {
        console.error("Error deleting player:", error);
      }
    };

    // Handle tab closing/reloading
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Use Beacon API for reliability
      const payload = JSON.stringify({ playerId });
      navigator.sendBeacon("/api/delete-player", payload);
    };

    // Handle in-app navigation
    // const handleVisibilityChange = () => {
    //   if (document.visibilityState === "hidden") {
    //     const payload = JSON.stringify({ playerId });
    //     navigator.sendBeacon("/api/delete-player", payload);
    //   }
    // };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    // document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      // document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [playerId, roomId]);
};
