const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const formatCurrency = (amount: number, currency: string = "PKR") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: amount >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(amount);

export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const formatPercentChange = (current: number, previous: number) => {
  if (previous === 0 && current === 0) {
    return { change: "0.0%", trend: "up" };
  }

  if (previous === 0) {
    return { change: "+100.0%", trend: "up" };
  }

  const percent = ((current - previous) / previous) * 100;

  return {
    change: (percent >= 0 ? "+" : "") + percent.toFixed(1) + "%",
    trend: percent >= 0 ? "up" : "down",
  };
};

export const inRange = (date: Date, start: Date, end: Date) => {
  return date >= start && date < end;
};

export const getMonthLabel = (date: Date) => monthLabels[date.getMonth()];

export const formatStockAlertDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
