import { Product } from "@/models/product-model";
import { Stock } from "@/modules/stock/model";
import {
  formatCompactNumber,
  formatCurrency,
  formatPercentChange,
  formatStockAlertDate,
  getMonthLabel,
  inRange,
} from "@/utils";

export const buildDashboardStats = async (
  ownerId: string,
  options?: { threshold?: number; months?: number },
) => {
  const threshold = Number(options?.threshold || 20);
  const monthsCount = Number(options?.months || 6);

  const [products, stocks] = await Promise.all([
    Product.find({ owner: ownerId }).select("name purchasePrice sellingPrice currency").lean(),
    Stock.find({ owner: ownerId }).select("_id name quantity updatedAt stockHistory").lean(),
  ]);

  const purchasePriceMap = new Map(
    products.map((product) => [product.name, Number(product.purchasePrice) || 0]),
  );

  const historyEntries = stocks.flatMap((stock: any) =>
    (stock.stockHistory || []).map((entry: any) => ({
      stockId: stock._id,
      stockName: stock.name,
      quantity: Number(entry.quantity) || 0,
      price: Number(entry.price) || 0,
      type: entry.type || "stock-in",
      date: new Date(entry.date),
    })),
  );

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentMonthEntries = historyEntries.filter((entry) =>
    inRange(entry.date, currentMonthStart, nextMonthStart),
  );

  const previousMonthEntries = historyEntries.filter((entry) =>
    inRange(entry.date, previousMonthStart, currentMonthStart),
  );

  const sumRevenue = (entries: any[]) =>
    entries
      .filter((entry) => entry.type === "order")
      .reduce((sum, entry) => sum + entry.price * entry.quantity, 0);

  const sumReturns = (entries: any[]) =>
    entries
      .filter((entry) => entry.type === "wastage")
      .reduce((sum, entry) => sum + entry.quantity, 0);

  const sumPurchases = (entries: any[]) =>
    entries
      .filter((entry) => entry.type === "stock-in")
      .reduce((sum, entry) => sum + entry.quantity, 0);

  const sumCostOfSold = (entries: any[]) =>
    entries
      .filter((entry) => entry.type === "order")
      .reduce(
        (sum, entry) => sum + (purchasePriceMap.get(entry.stockName) || 0) * entry.quantity,
        0,
      );

  const totalRevenue = sumRevenue(currentMonthEntries);
  const previousRevenue = sumRevenue(previousMonthEntries);

  const salesReturn = sumReturns(currentMonthEntries);
  const previousSalesReturn = sumReturns(previousMonthEntries);

  const purchases = sumPurchases(currentMonthEntries);
  const previousPurchases = sumPurchases(previousMonthEntries);

  const netIncome = totalRevenue - sumCostOfSold(currentMonthEntries);
  const previousNetIncome = previousRevenue - sumCostOfSold(previousMonthEntries);

  const revenueChange = formatPercentChange(totalRevenue, previousRevenue);
  const returnChange = formatPercentChange(salesReturn, previousSalesReturn);
  const purchasesChange = formatPercentChange(purchases, previousPurchases);
  const netIncomeChange = formatPercentChange(netIncome, previousNetIncome);

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      change: revenueChange.change,
      trend: revenueChange.trend,
      subtitle: "vs last month",
    },
    {
      title: "Sales Return",
      value: formatCompactNumber(salesReturn),
      change: returnChange.change,
      trend: returnChange.trend,
      subtitle: "wastage entries",
    },
    {
      title: "Purchases",
      value: formatCompactNumber(purchases),
      change: purchasesChange.change,
      trend: purchasesChange.trend,
      subtitle: "stock in quantity",
    },
    {
      title: "Net Income",
      value: formatCurrency(netIncome),
      change: netIncomeChange.change,
      trend: netIncomeChange.trend,
      subtitle: "estimated profit",
    },
  ];

  const salesBars = Array.from({ length: monthsCount }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1 - index), 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

    const monthEntries = historyEntries.filter((entry) =>
      inRange(entry.date, monthStart, monthEnd),
    );

    const purchase = monthEntries
      .filter((entry) => entry.type === "stock-in")
      .reduce((sum, entry) => sum + entry.quantity, 0);

    const income = monthEntries
      .filter((entry) => entry.type === "order")
      .reduce((sum, entry) => sum + entry.price * entry.quantity, 0);

    return {
      label: getMonthLabel(monthDate),
      purchase,
      income,
    };
  });

  const topProductMap = new Map<string, { name: string; orders: number; revenue: number }>();

  historyEntries
    .filter((entry) => entry.type === "order")
    .forEach((entry) => {
      const current = topProductMap.get(entry.stockName) || {
        name: entry.stockName,
        orders: 0,
        revenue: 0,
      };

      current.orders += entry.quantity;
      current.revenue += entry.price * entry.quantity;
      topProductMap.set(entry.stockName, current);
    });

  const totalSoldUnits = Array.from(topProductMap.values()).reduce(
    (sum, item) => sum + item.orders,
    0,
  );

  const topProducts = Array.from(topProductMap.values())
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 4)
    .map((item) => ({
      name: item.name,
      orders: item.orders,
      revenue: formatCurrency(item.revenue),
      share: totalSoldUnits ? Math.round((item.orders / totalSoldUnits) * 100) : 0,
    }));

  const stockAlerts = stocks
    .filter((stock: any) => Number(stock.quantity) <= threshold)
    .sort((a: any, b: any) => Number(a.quantity) - Number(b.quantity))
    .slice(0, 4)
    .map((stock: any) => {
      const quantity = Number(stock.quantity) || 0;

      let status = "Moderate";
      if (quantity <= Math.floor(threshold * 0.5)) {
        status = "Critical";
      } else if (quantity <= Math.floor(threshold * 0.8)) {
        status = "Low";
      }

      return {
        id: "#ST-" + String(stock._id).slice(-4).toUpperCase(),
        date: formatStockAlertDate(new Date(stock.updatedAt)),
        quantity: quantity + " pcs",
        threshold: threshold + " pcs",
        status,
      };
    });

  return {
    stats,
    salesBars,
    stockAlerts,
    topProducts,
  };
};
