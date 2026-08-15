/**
 * Masud Telecom - Bangladesh Standard Time (BST, UTC+6) and 6:00 AM Business Day Engine
 *
 * Bangladesh Standard Time is UTC+6 (Asia/Dhaka, no DST).
 * Daily business cycle starts at 6:00 AM BST (06:00 BST = 00:00 UTC).
 */

export const BD_TIMEZONE = 'Asia/Dhaka';
export const BD_OFFSET_HOURS = 6;
export const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
export const BD_CYCLE_START_HOUR = 6; // 6:00 AM

/**
 * Gets the current Date converted to Bangladesh Time (BST)
 */
export function getNowInBD(): Date {
  return new Date();
}

/**
 * Returns year, month, day, hours, minutes, seconds in Bangladesh Timezone (Asia/Dhaka)
 */
export function getBDPattern(dateInput?: Date | string | number): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  millisecond: number;
  dateStr: string; // YYYY-MM-DD
  timeStr12: string; // hh:mm:ss AM/PM
  timeStr24: string; // HH:mm:ss
} {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return getBDPattern(now);
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BD_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  let year = d.getUTCFullYear();
  let month = d.getUTCMonth() + 1;
  let day = d.getUTCDate();
  let hour = d.getUTCHours();
  let minute = d.getUTCMinutes();
  let second = d.getUTCSeconds();

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
    if (part.type === 'day') day = parseInt(part.value, 10);
    if (part.type === 'hour') hour = parseInt(part.value, 10) % 24;
    if (part.type === 'minute') minute = parseInt(part.value, 10);
    if (part.type === 'second') second = parseInt(part.value, 10);
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const timeStr24 = `${pad(hour)}:${pad(minute)}:${pad(second)}`;

  const h12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const timeStr12 = `${pad(h12)}:${pad(minute)}:${pad(second)} ${ampm}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond: d.getMilliseconds(),
    dateStr,
    timeStr12,
    timeStr24
  };
}

/**
 * Computes the start of the 6:00 AM Bangladesh Business Day cycle.
 * If current BD time is >= 6:00 AM, cycle started at 6:00 AM BST today.
 * If current BD time is < 6:00 AM, cycle started at 6:00 AM BST yesterday.
 */
export function getBDTodayRange(nowDate?: Date | string | number): {
  start: Date;
  end: Date;
  businessDateStr: string; // e.g. "2026-08-15"
  displayLabel: string;
} {
  const bd = getBDPattern(nowDate);

  let cycleYear = bd.year;
  let cycleMonth = bd.month;
  let cycleDay = bd.day;

  // If before 6 AM BST, it belongs to previous calendar day's 6 AM cycle
  if (bd.hour < BD_CYCLE_START_HOUR) {
    const prevDate = new Date(Date.UTC(bd.year, bd.month - 1, bd.day - 1, 0, 0, 0));
    cycleYear = prevDate.getUTCFullYear();
    cycleMonth = prevDate.getUTCMonth() + 1;
    cycleDay = prevDate.getUTCDate();
  }

  // In Bangladesh (UTC+6), 6:00 AM BST is exactly 00:00:00.000 UTC
  const startTimeMs = Date.UTC(cycleYear, cycleMonth - 1, cycleDay, 0, 0, 0, 0);
  const endTimeMs = startTimeMs + 24 * 60 * 60 * 1000 - 1; // 23:59:59.999 UTC = 05:59:59.999 BST next day

  const start = new Date(startTimeMs);
  const end = new Date(endTimeMs);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const businessDateStr = `${cycleYear}-${pad(cycleMonth)}-${pad(cycleDay)}`;

  return {
    start,
    end,
    businessDateStr,
    displayLabel: `Today (from 6:00 AM BST, ${pad(cycleDay)}/${pad(cycleMonth)}/${cycleYear})`
  };
}

/**
 * Checks if a given timestamp belongs to "Today" in Bangladesh (counting from 6:00 AM BST)
 */
export function isBDToday(dateInput: Date | string | number, nowDate?: Date): boolean {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;

  const { start, end } = getBDTodayRange(nowDate);
  const time = d.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

/**
 * Returns formatted Bangladesh Time string: e.g. "08:35 AM"
 */
export function formatBDTime(dateInput?: Date | string | number, includeSeconds = false): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleTimeString('en-US', {
    timeZone: BD_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true
  });
}

/**
 * Returns formatted Bangladesh Date string: e.g. "15 Aug 2026" or "15/08/2026"
 */
export function formatBDDate(dateInput?: Date | string | number, format: 'short' | 'medium' | 'full' = 'medium'): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  if (format === 'short') {
    return d.toLocaleDateString('en-GB', {
      timeZone: BD_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  return d.toLocaleDateString('en-US', {
    timeZone: BD_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Returns formatted Date & Time string in Bangladesh Time: e.g. "15 Aug 2026, 08:35 AM BST"
 */
export function formatBDDateTime(dateInput?: Date | string | number, includeBST = true): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const dateStr = formatBDDate(d, 'medium');
  const timeStr = formatBDTime(d, false);
  return `${dateStr}, ${timeStr}${includeBST ? ' BST' : ''}`;
}

/**
 * Returns standard date string (YYYY-MM-DD) in Bangladesh Timezone
 */
export function getBDDateOnly(dateInput?: Date | string | number): string {
  const bd = getBDPattern(dateInput);
  return bd.dateStr;
}

/**
 * Returns current Bangladesh clock info for live UI headers
 */
export function getLiveBDClock(): {
  time12: string;
  dateMedium: string;
  cycleInfo: string;
  isAfter6AM: boolean;
} {
  const now = new Date();
  const bd = getBDPattern(now);
  const { businessDateStr } = getBDTodayRange(now);
  const h12 = bd.hour % 12 || 12;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ampm = bd.hour >= 12 ? 'PM' : 'AM';
  const time12 = `${pad(h12)}:${pad(bd.minute)}:${pad(bd.second)} ${ampm} BST`;
  const dateMedium = formatBDDate(now, 'medium');

  return {
    time12,
    dateMedium,
    cycleInfo: `Today Cycle: from 6:00 AM (${businessDateStr})`,
    isAfter6AM: bd.hour >= BD_CYCLE_START_HOUR
  };
}

/**
 * Validates whether a transaction timestamp falls within the given Bangladesh date filter
 */
export function matchesBDDateFilter(
  dateInput: Date | string | number,
  filter: {
    singleDate?: string;
    fromDate?: string;
    toDate?: string;
  }
): boolean {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;

  const txnDate = getBDDateOnly(d);

  if (filter.singleDate && txnDate !== filter.singleDate) {
    return false;
  }
  if (filter.fromDate && txnDate < filter.fromDate) {
    return false;
  }
  if (filter.toDate && txnDate > filter.toDate) {
    return false;
  }

  return true;
}

