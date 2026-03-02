import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Activity, ActivitiesResponse } from "../types";

export type ActivityFilters = {
  location?: string;
  type?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  pageSize?: number;
  featured?: boolean;
};

type ActivitiesState = {
  loading: boolean;
  error: string;
  activities: Activity[];
  meta: ActivitiesResponse["meta"] | null;
};

const initialState: ActivitiesState = {
  loading: false,
  error: "",
  activities: [],
  meta: null,
};

export const useActivities = (filters: ActivityFilters): ActivitiesState => {
  const [state, setState] = useState<ActivitiesState>(initialState);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const requestFilters = useMemo(() => JSON.parse(filterKey) as ActivityFilters, [filterKey]);

  useEffect(() => {
    let cancelled = false;

    const loadActivities = async () => {
      setState((prev) => ({ ...prev, loading: true, error: "" }));
      try {
        const response = await api.getActivities(requestFilters);
        if (cancelled) return;
        setState({
          loading: false,
          error: "",
          activities: response.data,
          meta: response.meta,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load activities",
          activities: [],
          meta: null,
        });
      }
    };

    void loadActivities();

    return () => {
      cancelled = true;
    };
  }, [requestFilters]);

  return state;
};
