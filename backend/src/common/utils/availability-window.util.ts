export type TimeInterval = { start: Date; end: Date };

export type RecurringRuleLike = {
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
};

function utcDayBounds(d: Date): { dayStart: Date; dayEnd: Date } {
  const dayStart = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  return { dayStart, dayEnd };
}

function applyTimeOnUtcDay(
  dayStart: Date,
  hour: number,
  minute: number,
): Date {
  const t = new Date(dayStart);
  t.setUTCHours(hour, minute, 0, 0);
  return t;
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}

export function mergeIntervals(windows: TimeInterval[]): TimeInterval[] {
  if (!windows.length) {
    return [];
  }
  const sorted = [...windows].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const out: TimeInterval[] = [];
  let cur = { start: sorted[0].start, end: sorted[0].end };
  for (let i = 1; i < sorted.length; i++) {
    const w = sorted[i];
    if (w.start <= cur.end) {
      cur.end = maxDate(cur.end, w.end);
    } else {
      out.push(cur);
      cur = { start: w.start, end: w.end };
    }
  }
  out.push(cur);
  return out.filter((x) => x.start < x.end);
}

/**
 * Expand weekly recurring rules into concrete UTC intervals clipped to [from, to).
 */
export function expandRecurringRulesToWindows(
  rules: RecurringRuleLike[],
  from: Date,
  to: Date,
): TimeInterval[] {
  const windows: TimeInterval[] = [];
  let day = utcDayBounds(from).dayStart;
  while (day < to) {
    const { dayStart, dayEnd } = utcDayBounds(day);
    const dayDow = dayStart.getUTCDay();
    for (const rule of rules) {
      if (rule.dayOfWeek !== dayDow) {
        continue;
      }
      if (rule.effectiveFrom > dayEnd) {
        continue;
      }
      if (rule.effectiveUntil && rule.effectiveUntil < dayStart) {
        continue;
      }
      const wStart = applyTimeOnUtcDay(
        dayStart,
        rule.startHour,
        rule.startMinute,
      );
      const wEnd = applyTimeOnUtcDay(dayStart, rule.endHour, rule.endMinute);
      if (wStart < wEnd) {
        const clip: TimeInterval = {
          start: maxDate(wStart, from),
          end: minDate(wEnd, to),
        };
        if (clip.start < clip.end) {
          windows.push(clip);
        }
      }
    }
    day = new Date(dayStart);
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return windows;
}

export function intervalContainedInUnion(
  segment: TimeInterval,
  union: TimeInterval[],
): boolean {
  if (!(segment.start < segment.end)) {
    return false;
  }
  const merged = mergeIntervals(union);
  return merged.some(
    (w) => w.start <= segment.start && w.end >= segment.end,
  );
}
