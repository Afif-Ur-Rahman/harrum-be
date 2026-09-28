import { Expense } from "@/modules/expenses/model";
import { Order } from "@/modules/orders/model";
import { formatCompactNumber, formatPercentChange } from "@/utils";

interface DateRange {
  start: Date;
  end: Date;
}

interface MonthMetrics {
  revenue: number;
  salesReturn: number;
  costOfGoodsSold: number;
}

const getMonthRanges = (now = new Date()) => {
  const year = now.getFullYear();
  const month = now.getMonth();

  return {
    current: { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) },
    previous: { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) },
  };
};

const getExpenses = async ({ start, end }: DateRange) => {
  const [result] = await Expense.aggregate([
    { $match: { date: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return result?.total ?? 0;
};

const getOrderMetrics = async (current: DateRange, previous: DateRange) => {
  const orders = await Order.find({ updatedAt: { $gte: previous.start } }).lean();

  const empty = (): MonthMetrics => ({ revenue: 0, salesReturn: 0, costOfGoodsSold: 0 });
  const metrics = { current: empty(), previous: empty() };

  const bucketFor = (date?: Date) => {
    if (!date) return null;
    if (date >= current.start && date < current.end) return metrics.current;
    if (date >= previous.start && date < previous.end) return metrics.previous;
    return null;
  };

  for (const order of orders) {
    const soldBucket = bucketFor(order.createdAt);

    if (soldBucket) {
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

  return metrics;
};

const buildStat = (
  key: "revenue" | "salesReturn" | "expenses" | "netIncome",
  title: string,
  subtitle: string,
  current: number,
  previous: number,
) => ({
  key,
  title,
  value: formatCompactNumber(current),
  ...formatPercentChange(current, previous),
  subtitle,
});

export const getDashboardStats = async () => {
  const { current, previous } = getMonthRanges();

  const [orderMetrics, expensesCurrent, expensesPrevious] = await Promise.all([
    getOrderMetrics(current, previous),
    getExpenses(current),
    getExpenses(previous),
  ]);

  const netIncome = (m: MonthMetrics, expenses: number) =>
    m.revenue - m.salesReturn - m.costOfGoodsSold - expenses;

  return {
    stats: [
      buildStat(
        "revenue",
        "Total Revenue",
        "vs last month",
        orderMetrics.current.revenue,
        orderMetrics.previous.revenue,
      ),
      buildStat(
        "salesReturn",
        "Sales Return",
        "returned sales value",
        orderMetrics.current.salesReturn,
        orderMetrics.previous.salesReturn,
      ),
      buildStat("expenses", "Expenses", "shop expenses", expensesCurrent, expensesPrevious),
      buildStat(
        "netIncome",
        "Net Income",
        "after cost & expenses",
        netIncome(orderMetrics.current, expensesCurrent),
        netIncome(orderMetrics.previous, expensesPrevious),
      ),
    ],
  };
};
