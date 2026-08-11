import type { TimelineItem } from '../types/timeline';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const BASE_PX_PER_DAY = 32;

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function shiftIsoDate(iso: string, days: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface DateRange {
  minDate: Date;
  maxDate: Date;
  totalDays: number;
}

export function getDateRange(items: TimelineItem[]): DateRange {
  if (items.length === 0) {
    const today = new Date();
    return { minDate: today, maxDate: today, totalDays: 1 };
  }

  const starts = items.map((item) => new Date(item.start).getTime());
  const ends = items.map((item) => new Date(item.end).getTime());
  const minDate = new Date(Math.min(...starts));
  const maxDate = new Date(Math.max(...ends));

  return { minDate, maxDate, totalDays: daysBetween(minDate, maxDate) + 1 };
}

export interface ItemBar {
  left: number;
  width: number;
}

export function getItemBar(item: TimelineItem, minDate: Date, pxPerDay: number): ItemBar {
  const startOffsetDays = daysBetween(minDate, new Date(item.start));
  const durationDays = Math.max(1, daysBetween(new Date(item.start), new Date(item.end)) + 1);

  return {
    left: startOffsetDays * pxPerDay,
    width: durationDays * pxPerDay,
  };
}
