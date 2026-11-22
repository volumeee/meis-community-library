import { useSyncExternalStore } from 'react';
import { getLocalTodayIso } from '../utils/calendarLogic';

const listeners = new Set<() => void>();
let currentTodayIso = getLocalTodayIso();
let midnightTimer: number | undefined;

function refreshToday(): void {
  const next = getLocalTodayIso();
  if (next !== currentTodayIso) {
    currentTodayIso = next;
    listeners.forEach((listener) => listener());
  }
  scheduleNextMidnight();
}

function scheduleNextMidnight(): void {
  if (typeof window === 'undefined') return;
  if (midnightTimer !== undefined) {
    window.clearTimeout(midnightTimer);
  }
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0);
  midnightTimer = window.setTimeout(
    refreshToday,
    Math.max(1, nextMidnight.getTime() - Date.now() + 100)
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    currentTodayIso = getLocalTodayIso();
    scheduleNextMidnight();
    document.addEventListener('visibilitychange', refreshToday);
    window.addEventListener('focus', refreshToday);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      if (midnightTimer !== undefined) {
        window.clearTimeout(midnightTimer);
        midnightTimer = undefined;
      }
      document.removeEventListener('visibilitychange', refreshToday);
      window.removeEventListener('focus', refreshToday);
    }
  };
}

function getSnapshot(): string {
  return currentTodayIso;
}

export function useLocalTodayIso(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getLocalTodayIso);
}
