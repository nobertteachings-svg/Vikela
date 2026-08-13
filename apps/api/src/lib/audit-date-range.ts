export type AuditDateRange = {
  from: Date;
  to: Date;
  fromLabel: string;
  toLabel: string;
};

function parseBoundary(value: string, endOfDay: boolean): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    if (endOfDay) {
      d.setUTCHours(23, 59, 59, 999);
    } else {
      d.setUTCHours(0, 0, 0, 0);
    }
  }
  return d;
}

export function parseAuditDateRange(from?: string, to?: string): AuditDateRange {
  if (!from?.trim() || !to?.trim()) {
    throw new Error("from and to are required (ISO date or YYYY-MM-DD)");
  }
  const fromDate = parseBoundary(from.trim(), false);
  const toDate = parseBoundary(to.trim(), true);
  if (fromDate.getTime() > toDate.getTime()) {
    throw new Error("from must be on or before to");
  }
  return {
    from: fromDate,
    to: toDate,
    fromLabel: from.trim().slice(0, 10),
    toLabel: to.trim().slice(0, 10),
  };
}

export function collectedAtFilter(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  if (!from?.trim() && !to?.trim()) return undefined;
  try {
    const range = parseAuditDateRange(from ?? to!, to ?? from!);
    return { gte: range.from, lte: range.to };
  } catch {
    return undefined;
  }
}

/** Optional list filters, partial range allowed (from only or to only). */
export function optionalDateFilter(
  from?: string,
  to?: string
): { gte?: Date; lte?: Date } | undefined {
  if (!from?.trim() && !to?.trim()) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (from?.trim()) {
    try {
      filter.gte = parseBoundary(from.trim(), false);
    } catch {
      return undefined;
    }
  }
  if (to?.trim()) {
    try {
      filter.lte = parseBoundary(to.trim(), true);
    } catch {
      return undefined;
    }
  }
  return filter;
}
