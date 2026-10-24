"use client";

import { useEffect, useState } from "react";
import { api } from "@/hooks/api";

export interface CityLocation {
  city: string;
  state: string;
}

export function useCityLookup(query: string) {
  const [locations, setLocations] = useState<CityLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const city = query.trim();
    setLocations([]);
    setError(false);
    if (city.length < 3) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = (await api<{ locations: CityLocation[] }>(
          `/api/v1/city/lookup?city=${encodeURIComponent(city)}`,
          { signal: controller.signal },
        )).data;
        if (controller.signal.aborted) return;
        setLocations(result.locations);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { locations, loading, error };
}
