/**
 * Time utilities for UTC <-> Local (GMT+7) conversions and Auction countdowns.
 *
 * Backend Rule:
 * All timestamps stored and transmitted via API are ISO 8601 UTC strings.
 * Form inputs for `startTime`/`endTime` must be converted to ISO UTC before submission.
 * Countdowns calculate remaining milliseconds directly between UTC target and current time.
 */

export type DateInput = Date | string | number;

/**
 * Safely parse date input into a valid Date object.
 * Throws RangeError if date is invalid.
 */
function parseDate(input: DateInput): Date {
  if (input instanceof Date) {
    if (isNaN(input.getTime())) {
      throw new RangeError('Invalid Date object');
    }
    return input;
  }

  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid date input: "${String(input)}"`);
  }
  return parsed;
}

/**
 * Convert any valid date representation into a standardized ISO 8601 UTC string.
 * Example output: "2026-11-21T03:30:00.000Z"
 */
export function toUtcIso(dateInput: DateInput): string {
  const date = parseDate(dateInput);
  return date.toISOString();
}

/**
 * Format a UTC date into local display string (GMT+7 / Vietnam timezone or browser locale).
 * Example output: "21/11/2026 10:30:00"
 */
export function formatLocalTime(
  dateInput: DateInput,
  options?: Intl.DateTimeFormatOptions,
  locale = 'vi-VN'
): string {
  try {
    const date = parseDate(dateInput);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
      ...options,
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  } catch {
    return '--:--:--';
  }
}

/**
 * Calculate remaining milliseconds from now until the target UTC date.
 * Returns 0 if the target date has already passed.
 */
export function getRemainingMs(targetUtc: DateInput, referenceNowMs?: number): number {
  try {
    const targetMs = parseDate(targetUtc).getTime();
    const nowMs = referenceNowMs ?? Date.now();
    const remaining = targetMs - nowMs;
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

/**
 * Check if a given date is in the past.
 */
export function isPast(dateInput: DateInput, referenceNowMs?: number): boolean {
  try {
    const timeMs = parseDate(dateInput).getTime();
    const nowMs = referenceNowMs ?? Date.now();
    return timeMs <= nowMs;
  } catch {
    return true;
  }
}

/**
 * Check if a given date is in the future.
 */
export function isFuture(dateInput: DateInput, referenceNowMs?: number): boolean {
  return !isPast(dateInput, referenceNowMs);
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

/**
 * Break down remaining milliseconds into days, hours, minutes, seconds and a formatted string.
 * Example formatted outputs: "02:15:30" or "1d 04:12:08".
 */
export function formatCountdown(remainingMs: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const formatted =
    days > 0
      ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { days, hours, minutes, seconds, formatted };
}
