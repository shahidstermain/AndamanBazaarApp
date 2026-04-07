import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findRoute,
  getNextDepartures,
  type BargeSchedulesData,
  type FerryRoute,
} from '../../src/lib/bargeUtils';

// ── Minimal fixture data ──────────────────────────────────────────────────────

const mockSchedules: BargeSchedulesData = {
  routes: [
    {
      id: 'pb-havelock',
      from: 'Port Blair',
      to: 'Havelock',
      distance_km: 55,
      operators: [
        {
          name: 'Makruzz',
          type: 'fast',
          booking_url: 'https://makruzz.com',
          schedule: [
            {
              days: ['Mon', 'Wed', 'Fri'],
              departure: '08:30',
              arrival: '10:00',
              duration_hours: 1.5,
            },
          ],
        },
        {
          name: 'Government Ferry',
          type: 'slow',
          booking_url: '',
          schedule: [
            {
              days: ['Daily'],
              departure: '06:00',
              arrival: '09:00',
              duration_hours: 3,
            },
          ],
        },
      ],
    },
  ],
  barge_services: [],
  monsoon_alerts: {
    active: false,
    message: '',
    affected_routes: [],
  },
  last_updated: '2025-01-01',
};

// ── findRoute ─────────────────────────────────────────────────────────────────

describe('findRoute', () => {
  it('finds a direct route', () => {
    const route = findRoute(mockSchedules, 'Port Blair', 'Havelock');
    expect(route).not.toBeNull();
    expect(route!.from).toBe('Port Blair');
    expect(route!.to).toBe('Havelock');
  });

  it('finds a reverse route and swaps from/to', () => {
    const route = findRoute(mockSchedules, 'Havelock', 'Port Blair');
    expect(route).not.toBeNull();
    expect(route!.from).toBe('Havelock');
    expect(route!.to).toBe('Port Blair');
    expect(route!.id).toContain('-reverse');
  });

  it('returns null for unknown routes', () => {
    const route = findRoute(mockSchedules, 'Port Blair', 'Unknown Island');
    expect(route).toBeNull();
  });
});

// ── getNextDepartures ─────────────────────────────────────────────────────────

describe('getNextDepartures', () => {
  const route = mockSchedules.routes[0];

  it('returns departures array', () => {
    // Monday at 07:00 — Makruzz departs at 08:30, govt ferry already gone (06:00)
    const ref = new Date('2025-01-06T07:00:00'); // Monday
    const departures = getNextDepartures(route, ref);
    expect(departures).toBeInstanceOf(Array);
    expect(departures.length).toBeGreaterThan(0);
  });

  it('returns Makruzz departure on a Monday before 08:30', () => {
    const ref = new Date('2025-01-06T07:00:00'); // Monday 07:00
    const departures = getNextDepartures(route, ref);
    const makruzz = departures.find((d) => d.operator === 'Makruzz');
    expect(makruzz).toBeDefined();
    expect(makruzz!.departure).toBe('08:30');
  });

  it('marks isTomorrow correctly when no more departures today', () => {
    // Monday at 23:00 — no more today, Makruzz next is Wednesday
    const ref = new Date('2025-01-06T23:00:00'); // Monday 23:00
    const departures = getNextDepartures(route, ref);
    // At least the Government Ferry (Daily) should appear as tomorrow
    expect(departures.some((d) => d.isTomorrow)).toBe(true);
  });

  it('correctly formats timeUntil with hours and minutes', () => {
    const ref = new Date('2025-01-06T07:00:00'); // Mon 07:00, Makruzz at 08:30
    const departures = getNextDepartures(route, ref);
    const makruzz = departures.find((d) => d.operator === 'Makruzz');
    expect(makruzz!.timeUntil).toMatch(/^\d+h \d+m$/);
  });
});
