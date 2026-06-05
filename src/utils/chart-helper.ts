const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const generateDateBuckets = ({
  status,
  lastOrderDate,
  fromDate,
  toDate,
}: {
  status: string;
  lastOrderDate?: Date;
  fromDate?: Date;
  toDate?: Date;
}) => {
  const dates: string[] = [];
  const map: Record<string, number> = {};
  const now = new Date();

  if (status === "custom" && fromDate && toDate) {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(toDate);
    end.setHours(0, 0, 0, 0);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = formatLocalDate(d);
      dates.push(key);
      map[key] = 0;
    }
    return { dates, map };
  }

  if (lastOrderDate) {
    const start = new Date(lastOrderDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(0, 0, 0, 0);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = formatLocalDate(d);

      if (!map[key]) {
        dates.push(key);
        map[key] = 0;
      }
    }
    return { dates, map };
  }

  if (status === "Today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < 24; i++) {
      const from = new Date(start);
      from.setHours(i);

      const to = new Date(start);
      to.setHours(i + 1);

      const key = `${from.toLocaleString(undefined, {
        hour: "2-digit",
        hour12: true,
      })} - ${to.toLocaleString(undefined, {
        hour: "2-digit",
        hour12: true,
      })}`;

      dates.push(key);
      map[key] = 0;
    }

    return { dates, map };
  }

  if (status === "Current week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const key = formatLocalDate(d);
      dates.push(key);
      map[key] = 0;
    }
  } else if (status === "Current Month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const key = formatLocalDate(d);
      dates.push(key);
      map[key] = 0;
    }
  }

  return { dates, map };
};
