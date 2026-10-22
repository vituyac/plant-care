export type Plant = {
  id: string;
  name: string;
  icon: string;
  intervalDays: number;
  createdAt: string;
  lastWateredAt: string;
};

export type Watering = { id: string; plantId: string; plantName: string; icon: string; date: string };

export const PLANT_ICONS = [
  '🪴', '🌵', '🌿', '🌱', '🍀', '☘️', '🌴', '🌳', '🌲', '🎋', '🌾', '🍃',
  '🌻', '🌷', '🌹', '🌺', '🌸', '🪷', '🪻', '💐', '🥀', '🍁', '🍂', '🍄', '🎍',
];

export function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(day: string, amount: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const result = new Date(year, month - 1, date);
  result.setDate(result.getDate() + amount);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
}

export function daysUntil(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  const due = Date.UTC(year, month - 1, date);
  const [currentYear, currentMonth, currentDate] = today().split('-').map(Number);
  return Math.round((due - Date.UTC(currentYear, currentMonth - 1, currentDate)) / 86400000);
}

export function nextWatering(plant: Plant): string {
  return addDays(plant.lastWateredAt || plant.createdAt, plant.intervalDays);
}
