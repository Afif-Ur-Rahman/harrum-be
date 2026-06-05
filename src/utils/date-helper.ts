export const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

export const getOrderStatsDateFilter = (status: string | undefined): Record<string, any> => {
  const now = new Date();
  if (status === "Today") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { createdAt: { $gte: startOfDay } };
  } else if (status === "Current week") {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    return { createdAt: { $gte: startOfWeek } };
  } else if (status === "2 weeks") {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const startOfThisWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday,
    );
    const startOfTwoWeeks = new Date(startOfThisWeek);
    startOfTwoWeeks.setDate(startOfThisWeek.getDate() - 7);
    return { createdAt: { $gte: startOfTwoWeeks } };
  } else if (status === "1 Month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { createdAt: { $gte: startOfMonth } };
  }
  return {};
};
