import { useEffect } from "react";
import API from "../api/axios";

// Custom hook to listen to specific global events and trigger refresh
export function useAutoRefresh(eventName, onRefresh) {
  useEffect(() => {
    const handleRefresh = (e) => {
      if (onRefresh) {
        onRefresh(e.detail);
      }
    };
    window.addEventListener(eventName, handleRefresh);
    return () => {
      window.removeEventListener(eventName, handleRefresh);
    };
  }, [eventName, onRefresh]);
}

// Setup global SSE connections to broadcast as custom window events
export function setupRealtimeUpdates() {
  const apiOrigin = (API.defaults.baseURL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
  const eventSource = new EventSource(`${apiOrigin}/api/admin/updates`);

  eventSource.addEventListener("orders_update", () => {
    window.dispatchEvent(new CustomEvent("admin_orders_update"));
  });

  eventSource.addEventListener("bookings_update", () => {
    window.dispatchEvent(new CustomEvent("admin_bookings_update"));
  });

  eventSource.addEventListener("transactions_update", () => {
    window.dispatchEvent(new CustomEvent("admin_transactions_update"));
  });

  eventSource.onerror = (err) => {
    console.error("SSE connection error", err);
  };

  return () => {
    eventSource.close();
  };
}
