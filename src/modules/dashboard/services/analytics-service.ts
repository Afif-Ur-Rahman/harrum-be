import { Expense } from "@/modules/expenses/model";
import { Order } from "@/modules/orders/model";

import { addDays, DashboardRanges, diffInDays, startOfDay } from "../utils";

export interface SalesAnalyticsPoint {
  label: string;
  date: string;
  revenue: number;
  orders: number;
  netIncome: number;
}

interface BucketMetrics {
  revenue: number;
  orders: number;
  salesReturn: number;
  costOfGoodsSold: number;
  expenses: number;
}

const emptyBucket = (): BucketMetrics => ({
  revenue: 0,
  orders: 0,
  salesReturn: 0,
  costOfGoodsSold: 0,
  expenses: 0,
});

const formatHour = (hour: number) => {
  const period = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${twelveHour} ${period}`;
};

const formatMonth = (date: Date) => date.toLocaleString("en-US", { month: "short" });

export const getSalesAnalytics = async ({
  current,
  days,
}: DashboardRanges): Promise<SalesAnalyticsPoint[]> => {
  const { start, end } = current;

  const hourly = days === 1;

  const buckets: BucketMetrics[] = Array.from({ length: hourly ? 24 : days }, emptyBucket);

  const bucketFor = (date?: Date) => {
    if (!date || date < start || date >= end) return null;

    const index = hourly ? date.getHours() : diffInDays(start, startOfDay(date));

    return buckets[index] ?? null;
  };

  const [orders, expenses] = await Promise.all([
    Order.find({ updatedAt: { $gte: start }, createdAt: { $lt: end } }).lean(),
    Expense.find({ date: { $gte: start, $lt: end } })
      .select("amount date")
      .lean(),
  ]);

  for (const order of orders) {
    const soldBucket = bucketFor(order.createdAt);

    if (soldBucket) {
      soldBucket.orders += 1;
      soldBucket.revenue += order.totalPrice || 0;
    }

    for (const item of order.items) {
      const unitCost = item.purchasePrice || 0;

      const lines = item.variants?.length
        ? item.variants.map((variant) => ({
            quantity: variant.quantity || 0,
            amount: variant.price || 0,
            returned: !!variant.isReturned,
            returnedAt: variant.returnedAt,
          }))
        : [
            {
              quantity: item.quantity || 0,
              amount: item.price || 0,
              returned: !!item.isReturned,
              returnedAt: item.returnedAt,
            },
          ];

      for (const line of lines) {
        const lineCost = line.quantity * unitCost;

        if (soldBucket) {
          soldBucket.costOfGoodsSold += lineCost;
        }

        if (line.returned) {
          const returnBucket = bucketFor(line.returnedAt);

          if (returnBucket) {
            returnBucket.salesReturn += line.amount;
            returnBucket.costOfGoodsSold -= lineCost;
          }
        }
      }
    }
  }

  for (const expense of expenses) {
    const bucket = bucketFor(expense.date);

    if (bucket) {
      bucket.expenses += expense.amount || 0;
    }
  }

  const spansYears = start.getFullYear() !== addDays(end, -1).getFullYear();

  return buckets.map((bucket, index) => {
    let label: string;
    let date: string;

    if (hourly) {
      label = formatHour(index);
      date = `${start.getDate()} ${formatMonth(start)}, ${formatHour(index)}`;
    } else {
      const day = addDays(start, index);
      const dayNumber = day.getDate();
      const month = formatMonth(day);

      label = index === 0 || dayNumber === 1 ? `${dayNumber} ${month}` : String(dayNumber);
      date = `${dayNumber} ${month}${spansYears ? ` ${day.getFullYear()}` : ""}`;
    }

    return {
      label,
      date,
      revenue: bucket.revenue,
      orders: bucket.orders,
      netIncome: bucket.revenue - bucket.salesReturn - bucket.costOfGoodsSold - bucket.expenses,
    };
  });
};
