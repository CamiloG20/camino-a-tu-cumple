/** @typedef {0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31} DayNumber */

export const MIN_DAY_NUMBER = 0;
export const MAX_DAY_NUMBER = 31;

/**
 * @param {unknown} value
 * @returns {value is DayNumber}
 */
export function isValidDayNumber(value) {
  const day = Number(value);
  return Number.isInteger(day) && day >= MIN_DAY_NUMBER && day <= MAX_DAY_NUMBER;
}

/**
 * @param {unknown} value
 * @returns {DayNumber | null}
 */
export function parseDayNumber(value) {
  const day = Number(value);
  if (!isValidDayNumber(day)) {
    return null;
  }
  return /** @type {DayNumber} */ (day);
}
