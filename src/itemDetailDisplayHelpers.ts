import { formatDate } from './utils';

export function formatStoredDate(stored?: string): string | undefined {
  if (!stored?.trim()) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(stored)) {
    return formatDate(`${stored.slice(0, 10)}T12:00:00.000Z`);
  }
  return formatDate(stored);
}

export function hasAnyValue(values: (string | undefined)[]): boolean {
  return values.some((value) => Boolean(value?.trim()));
}
