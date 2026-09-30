export const DASHBOARD_FILTERS = ["today", "last_week", "last_month", "custom"] as const;

export type DashboardFilter = (typeof DASHBOARD_FILTERS)[number];

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DashboardFilterInput {
  filter?: string;
  from?: string;
  to?: string;
}

export interface DashboardRanges {
  filter: DashboardFilter;
  current: DateRange;
  previous: DateRange;
  days: number;
}

export class InvalidDashboardFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDashboardFilterError";
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CUSTOM_DAYS = 366;

const PRESET_DAYS: Record<Exclude<DashboardFilter, "custom">, number> = {
  today: 1,
  last_week: 7,
  last_month: 30,
};

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const diffInDays = (start: Date, end: Date) =>
  Math.round((end.getTime() - start.getTime()) / DAY_MS);

const parseDateInput = (value?: string): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  return isRealDate ? date : null;
};

export const getDashboardRanges = (
  input: DashboardFilterInput = {},
  now = new Date(),
): DashboardRanges => {
  const filter = (input.filter || "last_month") as DashboardFilter;

  if (!DASHBOARD_FILTERS.includes(filter)) {
    throw new InvalidDashboardFilterError(
      `Invalid filter. Allowed filters are: ${DASHBOARD_FILTERS.join(", ")}`,
    );
  }

  const tomorrow = addDays(startOfDay(now), 1);

  let current: DateRange;

  if (filter === "custom") {
    const from = parseDateInput(input.from);
    const to = parseDateInput(input.to);

    if (!from || !to) {
      throw new InvalidDashboardFilterError(
        "Custom filter requires valid 'from' and 'to' dates (YYYY-MM-DD)",
      );
    }

    if (from > to) {
      throw new InvalidDashboardFilterError("'from' date must be before or equal to 'to' date");
    }

    current = { start: from, end: addDays(to, 1) };

    if (diffInDays(current.start, current.end) > MAX_CUSTOM_DAYS) {
      throw new InvalidDashboardFilterError(
        `Custom range cannot be longer than ${MAX_CUSTOM_DAYS} days`,
      );
    }
  } else {
    current = { start: addDays(tomorrow, -PRESET_DAYS[filter]), end: tomorrow };
  }

  const days = diffInDays(current.start, current.end);

  const previous: DateRange = {
    start: addDays(current.start, -days),
    end: current.start,
  };

  return { filter, current, previous, days };
};
