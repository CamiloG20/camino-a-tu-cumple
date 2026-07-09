export const MIN_DAY_NUMBER = 0;
export const MAX_DAY_NUMBER = 31;

export function isValidDayNumber(value) {
  const day = Number(value);
  return Number.isInteger(day) && day >= MIN_DAY_NUMBER && day <= MAX_DAY_NUMBER;
}

export function parseDayNumber(value) {
  const day = Number(value);
  if (!isValidDayNumber(day)) {
    return null;
  }
  return day;
}
