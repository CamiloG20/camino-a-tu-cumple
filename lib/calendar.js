/** Mes del cumpleaños en formato humano (1=enero, 7=julio). */
const BIRTHDAY_MONTH = Number(process.env.EXPO_PUBLIC_BIRTHDAY_MONTH) || 7;
const BIRTHDAY_DAY = Number(process.env.EXPO_PUBLIC_BIRTHDAY_DAY) || 9;

/** Mes 0-indexado para `Date` (julio = 6). */
export function getBirthdayMonthIndex() {
  return BIRTHDAY_MONTH - 1;
}

export function getBirthdayDay() {
  return BIRTHDAY_DAY;
}

export function getDaysUntilBirthday(date = new Date()) {
  const monthIndex = getBirthdayMonthIndex();
  const day = getBirthdayDay();
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let birthday = new Date(date.getFullYear(), monthIndex, day);

  if (today > birthday) {
    birthday = new Date(date.getFullYear() + 1, monthIndex, day);
  }

  return Math.round((birthday - today) / (1000 * 60 * 60 * 24));
}

export function getTodayDayIndex(daysCount, daysUntilBirthday) {
  let index = daysCount - 1 - daysUntilBirthday;
  if (index < 0) index = 0;
  if (index >= daysCount) index = daysCount - 1;
  return index;
}
