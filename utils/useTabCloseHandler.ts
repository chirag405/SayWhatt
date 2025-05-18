// utils/useTabCloseHandler.ts
import { useEffect } from "react";
import { deletePlayer } from "@/actions/user";
import { useUserRoomStore } from "@/store/user-room-store";
import { useRouter } from "next/navigation";

// Improved useTabCloseHandler
export const useTabCloseHandler = (
  playerId: string | null,
  roomId: string | null
) => {
  const { resetState } = useUserRoomStore();
  const router = useRouter();

  useEffect(() => {
    if (!playerId || !roomId) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Use Beacon API for reliability
      const payload = JSON.stringify({ playerId });
      navigator.sendBeacon("/api/delete-player", payload);

      // Set a flag indicating this is a page unload with a timestamp
      // The reload handler will use this to detect and handle reloads
      sessionStorage.setItem("pageUnloadTime", Date.now().toString());

      // Store the current location to help with reload detection
      if (typeof window !== "undefined") {
        sessionStorage.setItem("lastLocation", window.location.pathname);
      }
    };

    // For handling network disconnections and visibility changes
    const handleOffline = () => {
      const payload = JSON.stringify({ playerId });
      navigator.sendBeacon("/api/delete-player", payload);
      resetState();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("offline", handleOffline);
    };
  }, [playerId, roomId, resetState]);
};
