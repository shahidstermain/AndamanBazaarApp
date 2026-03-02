import type { TripPreferences } from './types';

export function getDateRange(preferences: TripPreferences): { start: Date; end: Date } {
  return {
    start: new Date(preferences.startDate),
    end: new Date(preferences.endDate),
  };
}

export function getTripDurationDays(preferences: TripPreferences): number {
  const { start, end } = getDateRange(preferences);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000)) + 1;
}

export function formatBudgetLabel(level: string): string {
  switch (level) {
    case 'budget':
      return 'Budget-friendly';
    case 'midrange':
      return 'Mid-range';
    case 'premium':
      return 'Premium';
    default:
      return level;
  }
}

export function formatPaceLabel(pace: string): string {
  switch (pace) {
    case 'relaxed':
      return 'Relaxed';
    case 'balanced':
      return 'Balanced';
    case 'packed':
      return 'Action-packed';
    default:
      return pace;
  }
}
