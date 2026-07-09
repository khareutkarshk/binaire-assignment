import { useCallback, useEffect, useState } from "react";
import { readOnlineStatus } from "../lib/cache";

type UseOnlineStatusOptions = {
  onReconnect?: () => void;
};

export function useOnlineStatus({ onReconnect }: UseOnlineStatusOptions = {}) {
  const [isOnline, setIsOnline] = useState(readOnlineStatus);

  const updateConnectionState = useCallback((online: boolean) => {
    setIsOnline(online);
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      onReconnect?.();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [onReconnect]);

  return { isOnline, updateConnectionState };
}
