import { useState, useEffect } from "react";

// ===== TYPES =====

export interface FerrySchedule {
  days: string[];
  departure: string;
  arrival: string;
  duration_hours: number;
  note?: string;
}

export interface FerryOperator {
  name: string;
  type: "fast" | "slow";
  schedule: FerrySchedule[];
  booking_url: string;
}

export interface FerryRoute {
  id: string;
  from: string;
  to: string;
  distance_km: number;
  operators: FerryOperator[];
}

export interface BargeSchedule {
  id: string;
  from: string;
  to: string;
  type: "cargo_barge";
  frequency: string;
  schedule: string;
  contact: string;
}

export interface BargeSchedulesData {
  routes: FerryRoute[];
  barge_services: BargeSchedule[];
  monsoon_alerts: {
    active: boolean;
    message: string;
    affected_routes: string[];
  };
  last_updated: string;
}

// ===== DATA LOADING =====

let cachedSchedules: BargeSchedulesData | null = null;

export async function loadBargeSchedules(): Promise<BargeSchedulesData> {
  if (cachedSchedules) {
    return cachedSchedules;
  }

  const response = await fetch("/barge-schedules.json");
  if (!response.ok) {
    throw new Error("Failed to load barge schedules");
  }

  cachedSchedules = await response.json();
  return cachedSchedules!;
}

// ===== ROUTE FINDER =====

export function findRoute(
  schedules: BargeSchedulesData,
  from: string,
  to: string,
): FerryRoute | null {
  // Check direct routes
  const directRoute = schedules.routes.find(
    (r) => r.from === from && r.to === to,
  );
  if (directRoute) return directRoute;

  // Check reverse routes (swap from/to)
  const reverseRoute = schedules.routes.find(
    (r) => r.from === to && r.to === from,
  );
  if (reverseRoute) {
    return {
      ...reverseRoute,
      from,
      to,
      id: `${reverseRoute.id}-reverse`,
    };
  }

  return null;
}

// ===== NEXT DEPARTURE CALCULATOR =====

export interface NextDeparture {
  operator: string;
  type: "fast" | "slow";
  departure: string;
  arrival: string;
  days: string[];
  timeUntil: string;
  isTomorrow: boolean;
  booking_url: string;
}

export function getNextDepartures(
  route: FerryRoute,
  referenceDate: Date = new Date(),
): NextDeparture[] {
  const departures: NextDeparture[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDay = dayNames[referenceDate.getDay()];
  const currentTime =
    referenceDate.getHours() * 60 + referenceDate.getMinutes();

  for (const operator of route.operators) {
    for (const schedule of operator.schedule) {
      const days = schedule.days.flatMap((d) => {
        if (d === "Daily") return dayNames.slice(1); // Mon-Sat
        return [d];
      });

      // Find next available day
      let nextDay = days.find((d) => {
        if (d !== currentDay) return false;
        const [hours, minutes] = schedule.departure.split(":").map(Number);
        const departureMinutes = hours * 60 + minutes;
        return departureMinutes > currentTime;
      });

      let isTomorrow = false;

      if (!nextDay) {
        // Look for tomorrow or later
        const currentDayIndex = dayNames.indexOf(currentDay);
        for (let i = 1; i <= 7; i++) {
          const checkIndex = (currentDayIndex + i) % 7;
          const checkDay = dayNames[checkIndex];
          if (days.includes(checkDay)) {
            nextDay = checkDay;
            isTomorrow = i === 1;
            break;
          }
        }
      }

      if (nextDay) {
        const [hours, minutes] = schedule.departure.split(":").map(Number);
        const departureMinutes = hours * 60 + minutes;
        const timeUntilMinutes = isTomorrow
          ? 24 * 60 - currentTime + departureMinutes
          : departureMinutes - currentTime;

        const hoursUntil = Math.floor(timeUntilMinutes / 60);
        const minutesUntil = timeUntilMinutes % 60;

        departures.push({
          operator: operator.name,
          type: operator.type,
          departure: schedule.departure,
          arrival: schedule.arrival,
          days: schedule.days,
          timeUntil:
            hoursUntil > 0
              ? `${hoursUntil}h ${minutesUntil}m`
              : `${minutesUntil}m`,
          isTomorrow,
          booking_url: operator.booking_url,
        });
      }
    }
  }

  // Sort by time until departure
  return departures.sort((a, b) => {
    const aMinutes =
      parseInt(a.timeUntil.split("h")[0] || "0") * 60 +
      parseInt(a.timeUntil.split(" ")[1] || "0");
    const bMinutes =
      parseInt(b.timeUntil.split("h")[0] || "0") * 60 +
      parseInt(b.timeUntil.split(" ")[1] || "0");
    return aMinutes - bMinutes;
  });
}

// ===== FORMATTERS =====

export function formatRouteName(from: string, to: string): string {
  return `${from} → ${to}`;
}

export function getRouteEmoji(type: "fast" | "slow"): string {
  return type === "fast" ? "⚡" : "🚢";
}

export function getFerryTypeLabel(type: "fast" | "slow"): string {
  return type === "fast" ? "Fast Ferry (1.5h)" : "Govt Ferry (2.5h)";
}

// ===== HOOK =====

export function useBargeSchedule(from?: string, to?: string) {
  const [schedules, setSchedules] = useState<BargeSchedulesData | null>(null);
  const [route, setRoute] = useState<FerryRoute | null>(null);
  const [nextDepartures, setNextDepartures] = useState<NextDeparture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBargeSchedules()
      .then((data) => {
        setSchedules(data);
        if (from && to) {
          const foundRoute = findRoute(data, from, to);
          setRoute(foundRoute);
          if (foundRoute) {
            setNextDepartures(getNextDepartures(foundRoute));
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [from, to]);

  return {
    schedules,
    route,
    nextDepartures,
    loading,
    error,
    hasMonsoonAlert: schedules?.monsoon_alerts?.active || false,
    monsoonMessage: schedules?.monsoon_alerts?.message || "",
  };
}

// ===== SUGGESTED PICKUP TIMES =====

export function suggestPickupTimes(
  departures: NextDeparture[],
  buyerLocation: string,
  sellerLocation: string,
): string[] {
  const suggestions: string[] = [];

  for (const dep of departures.slice(0, 3)) {
    const arrivalTime = dep.arrival;
    const [hours, minutes] = arrivalTime.split(":").map(Number);

    // Suggest meeting 30-60 minutes after arrival
    let meetHour = hours;
    let meetMinutes = minutes + 30;

    // Handle hour overflow
    if (meetMinutes >= 60) {
      meetHour = (meetHour + 1) % 24;
      meetMinutes = meetMinutes - 60;
    }

    const formattedMeetTime = `${meetHour.toString().padStart(2, "0")}:${meetMinutes.toString().padStart(2, "0")}`;

    suggestions.push(
      `Meet at ${sellerLocation} around ${formattedMeetTime} (${dep.operator} arrives at ${arrivalTime})`,
    );
  }

  return suggestions;
}
