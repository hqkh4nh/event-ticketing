import type { EventSummary } from '@/lib/api/events';
import { isSameVietnamProvince } from '@/constants/vietnam-provinces';

export type CategoryFilter = 'ALL' | EventSummary['category'];
export type TimeFilter = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'WEEKEND';
export type PriceFilter = 'ALL' | 'FREE' | 'PAID';
export type SortOption = 'SOONEST' | 'PRICE_ASC' | 'PRICE_DESC';

export type DiscoveryFilters = {
  time: TimeFilter;
  price: PriceFilter;
  sort: SortOption;
};

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  time: 'ALL',
  price: 'ALL',
  sort: 'SOONEST',
};

export type DiscoveryCriteria = DiscoveryFilters & {
  query: string;
  city: string | null;
  category: CategoryFilter;
  now?: Date;
};

type DateRange = {
  start: Date;
  end: Date;
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .trim();
}

function toValidDate(value: Date | string): Date | null {
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function getNow(now?: Date): Date {
  return now && !Number.isNaN(now.getTime()) ? now : new Date();
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = startOfDay(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getTimeRange(filter: TimeFilter, now: Date): DateRange | null {
  if (filter === 'ALL') return null;

  const today = startOfDay(now);

  if (filter === 'TODAY') {
    return { start: today, end: endOfDay(today) };
  }

  if (filter === 'THIS_WEEK') {
    return {
      start: today,
      end: endOfDay(addDays(today, (7 - today.getDay()) % 7)),
    };
  }

  const day = today.getDay();
  const saturday =
    day === 0
      ? addDays(today, -1)
      : day === 6
        ? today
        : addDays(today, 6 - day);

  return { start: saturday, end: endOfDay(addDays(saturday, 1)) };
}

function isInTimeRange(event: EventSummary, range: DateRange | null): boolean {
  if (!range) return true;

  const startAt = toValidDate(event.startAt);
  return Boolean(startAt && startAt >= range.start && startAt <= range.end);
}

function compareEvents(first: EventSummary, second: EventSummary, sort: SortOption): number {
  if (sort === 'PRICE_ASC') {
    return compareFiniteNumbers(first.minPriceVnd, second.minPriceVnd);
  }

  if (sort === 'PRICE_DESC') {
    return compareFiniteNumbers(second.minPriceVnd, first.minPriceVnd);
  }

  return compareFiniteNumbers(
    toValidDate(first.startAt)?.getTime(),
    toValidDate(second.startAt)?.getTime(),
  );
}

function compareFiniteNumbers(first: number | undefined, second: number | undefined): number {
  const firstIsFinite = Number.isFinite(first);
  const secondIsFinite = Number.isFinite(second);

  if (!firstIsFinite || !secondIsFinite) {
    if (firstIsFinite) return -1;
    if (secondIsFinite) return 1;
    return 0;
  }

  return first! - second!;
}

export function getEventCities(events: EventSummary[]): string[] {
  const cities = new Map<string, string>();

  for (const event of events) {
    const city = event.city.trim();
    if (!city) continue;

    const key = normalizeText(city);
    if (!cities.has(key)) cities.set(key, city);
  }

  return [...cities.values()].sort((first, second) =>
    first.localeCompare(second, 'vi-VN', { sensitivity: 'base' }),
  );
}

export function filterAndSortEvents(
  events: EventSummary[],
  criteria: DiscoveryCriteria,
): EventSummary[] {
  const query = normalizeText(criteria.query);
  const city = criteria.city?.trim();
  const range = getTimeRange(criteria.time, getNow(criteria.now));

  return events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => {
      if (city && !isSameVietnamProvince(event.city, city)) return false;
      if (criteria.category !== 'ALL' && event.category !== criteria.category) return false;
      if (query) {
        const matchesQuery = normalizeText(event.title).includes(query);
        if (!matchesQuery) return false;
      }
      if (!isInTimeRange(event, range)) return false;
      if (criteria.price === 'FREE' && event.minPriceVnd !== 0) return false;
      if (criteria.price === 'PAID' && event.minPriceVnd <= 0) return false;

      return true;
    })
    .sort((first, second) => {
      const difference = compareEvents(first.event, second.event, criteria.sort);
      return difference || first.index - second.index;
    })
    .map(({ event }) => event);
}

export function buildDiscoverySections(
  events: EventSummary[],
  city: string | null,
  now?: Date,
): {
  featured: EventSummary[];
  thisWeek: EventSummary[];
  free: EventSummary[];
  all: EventSummary[];
} {
  const baseCriteria = {
    query: '',
    city,
    category: 'ALL' as const,
    now,
    sort: 'SOONEST' as const,
  };

  const all = filterAndSortEvents(events, {
    ...baseCriteria,
    time: 'ALL',
    price: 'ALL',
  });

  return {
    featured: all.filter((event) => event.featured),
    thisWeek: filterAndSortEvents(events, {
      ...baseCriteria,
      time: 'THIS_WEEK',
      price: 'ALL',
    }),
    free: filterAndSortEvents(events, {
      ...baseCriteria,
      time: 'ALL',
      price: 'FREE',
    }),
    all,
  };
}

export function countActiveFilters(filters: DiscoveryFilters): number {
  return (
    Number(filters.time !== 'ALL') +
    Number(filters.price !== 'ALL') +
    Number(filters.sort !== 'SOONEST')
  );
}

export function isResultMode(
  query: string,
  category: CategoryFilter,
  filters: DiscoveryFilters,
): boolean {
  return Boolean(query.trim()) || category !== 'ALL' || countActiveFilters(filters) > 0;
}
