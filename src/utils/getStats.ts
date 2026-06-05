import { Model } from "mongoose";
type Period = "day" | "week" | "month";
function getDateRange(period: Period) {
  const now = new Date();
  let start: Date;
  switch (period) {
    case "day":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      break;
    default:
      throw new Error("Invalid period");
  }
  return { start, end: now };
}
export async function getLatestStats(model: Model<any>, period?: Period, filter: any = {}) {
  if (!period) {
    return model
      .find({
        ...filter,
        type: filter.type || { $nin: ["temp", "admin", "superAdmin"] },
      })
      .sort({ createdAt: -1 });
  }
  const { start, end } = getDateRange(period);
  return model.find({ ...filter, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 });
}

export async function getCount(model: Model<any>, period?: Period) {
  if (!period) {
    return model.countDocuments();
  }
  const { start, end } = getDateRange(period);
  return model.countDocuments({
    createdAt: { $gte: start, $lte: end },
  });
}
