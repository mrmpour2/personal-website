import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiClient } from "@/api/client";

export interface RestaurantAvailability {
  status: "OPEN" | "CLOSED" | "SETUP_REQUIRED";
  acceptsOrders: boolean;
  reasonCode?: "GLOBAL_STOP" | "SETUP_REQUIRED" | "MANUAL_OVERRIDE" | "SCHEDULE";
  timeZone: string | null;
  evaluatedAt: string;
  nextOpeningAt: string | null;
  nextTransitionAt: string | null;
}

interface RestaurantAvailabilityContextValue {
  availability: RestaurantAvailability | null;
  loading: boolean;
  unavailable: boolean;
  refresh: () => Promise<void>;
}

const RestaurantAvailabilityContext = createContext<RestaurantAvailabilityContextValue | null>(null);

function isAvailability(value: unknown): value is RestaurantAvailability {
  if (typeof value !== "object" || value === null) return false;
  const status = (value as { status?: unknown }).status;
  const reasonCode = (value as { reasonCode?: unknown }).reasonCode;
  return ["OPEN", "CLOSED", "SETUP_REQUIRED"].includes(String(status))
    && typeof (value as { acceptsOrders?: unknown }).acceptsOrders === "boolean"
    && (reasonCode === undefined || ["GLOBAL_STOP", "SETUP_REQUIRED", "MANUAL_OVERRIDE", "SCHEDULE"].includes(String(reasonCode)))
    && typeof (value as { evaluatedAt?: unknown }).evaluatedAt === "string";
}

export function RestaurantAvailabilityProvider({ children }: { children: ReactNode }) {
  const [availability, setAvailability] = useState<RestaurantAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      const { data } = await apiClient.get<unknown>("/public/restaurant-availability");
      if (!isAvailability(data)) throw new Error("Invalid restaurant availability response");
      if (currentRequest === requestId.current) {
        setAvailability(data);
        setUnavailable(false);
      }
    } catch {
      if (currentRequest === requestId.current) {
        setAvailability(null);
        setUnavailable(true);
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onAvailabilityChanged = () => void refresh();
    const onVisibilityChanged = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("realtime:restaurant-availability", onAvailabilityChanged);
    document.addEventListener("visibilitychange", onVisibilityChanged);
    return () => {
      requestId.current += 1;
      window.clearInterval(interval);
      window.removeEventListener("realtime:restaurant-availability", onAvailabilityChanged);
      document.removeEventListener("visibilitychange", onVisibilityChanged);
    };
  }, [refresh]);

  return <RestaurantAvailabilityContext.Provider value={{ availability, loading, unavailable, refresh }}>
    {children}
  </RestaurantAvailabilityContext.Provider>;
}

export function useRestaurantAvailability() {
  const context = useContext(RestaurantAvailabilityContext);
  if (!context) throw new Error("useRestaurantAvailability must be used inside RestaurantAvailabilityProvider");
  return context;
}
