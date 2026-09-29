import { Expense } from "@/modules/expenses/model";
import { Order } from "@/modules/orders/model";

export interface SalesAnalyticsPoint {
  label: string;
  date: string;
  revenue: number;
  orders: number;
  netIncome: number;
}

interface DayMetrics {
  revenue: number;
  orders: number;
  salesReturn: number;
  costOfGoodsSold: number;
  expenses: number;
}

export const getSalesAnalytics = async (): Promise<SalesAnalyticsPoint[]> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = start.toLocaleString("en-US", { month: "short" });

  const days: DayMetrics[] = Array.from({ length: daysInMonth }, () => ({
    revenue: 0,
    orders: 0,
    salesReturn: 0,
    costOfGoodsSold: 0,
    expenses: 0,
  }));

  const bucketFor = (date?: Date) =>
    date && date >= start && date < end ? days[date.getDate() - 1] : null;

  // updatedAt >= start also catches orders created this month
  const [orders, expenses] = await Promise.all([
    Order.find({ updatedAt: { $gte: start } }).lean(),
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

  return days.map((day, index) => ({
    label: String(index + 1),
    date: `${index + 1} ${monthLabel}`,
    revenue: day.revenue,
    orders: day.orders,
    netIncome: day.revenue - day.salesReturn - day.costOfGoodsSold - day.expenses,
  }));
};
