export function isFutureDate(date: Date, today = new Date()): boolean {
  const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return selectedDay > currentDay
}
