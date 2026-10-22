import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { addDays, Plant, today, Watering } from '../domain/plant';

type Data = { plants: Plant[]; waterings: Watering[]; language: 'ru' | 'en'; demoSeeded: boolean; demoSeedVersion: number };
type PlantContextValue = Data & {
  ready: boolean;
  error: boolean;
  addPlant: (name: string, icon: string, intervalDays: number) => Promise<void>;
  editPlant: (id: string, name: string, icon: string, intervalDays: number) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  waterPlant: (id: string) => Promise<void>;
  setLanguage: (language: 'ru' | 'en') => Promise<void>;
};

const KEY = 'plant-care-data-v1';
const LEGACY_DEMO_COUNT = 6;
const EXPANDED_DEMO_COUNT = 20;
const initial: Data = { plants: [], waterings: [], language: 'ru', demoSeeded: false, demoSeedVersion: 0 };
const PlantContext = createContext<PlantContextValue | null>(null);
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const DEMO_PLANTS = [
  { names: ['Монстера', 'Monstera'], icon: '🌿', intervalDays: 7, daysUntilWatering: 0 },
  { names: ['Орхидея', 'Orchid'], icon: '🌸', intervalDays: 5, daysUntilWatering: 0 },
  { names: ['Папоротник', 'Fern'], icon: '🍃', intervalDays: 3, daysUntilWatering: 0 },
  { names: ['Фикус', 'Ficus'], icon: '🌳', intervalDays: 6, daysUntilWatering: 2 },
  { names: ['Кактус', 'Cactus'], icon: '🌵', intervalDays: 14, daysUntilWatering: 8 },
  { names: ['Сансевиерия', 'Snake plant'], icon: '🪴', intervalDays: 10, daysUntilWatering: 4 },
  { names: ['Алоэ', 'Aloe'], icon: '🌱', intervalDays: 8, daysUntilWatering: 0 },
  { names: ['Эпипремнум', 'Pothos'], icon: '🍀', intervalDays: 6, daysUntilWatering: 0 },
  { names: ['Калатея', 'Calathea'], icon: '🌾', intervalDays: 4, daysUntilWatering: 0 },
  { names: ['Бегония', 'Begonia'], icon: '🌺', intervalDays: 5, daysUntilWatering: 0 },
  { names: ['Замиокулькас', 'ZZ plant'], icon: '🌿', intervalDays: 12, daysUntilWatering: 0 },
  { names: ['Антуриум', 'Anthurium'], icon: '🪷', intervalDays: 7, daysUntilWatering: 0 },
  { names: ['Драцена', 'Dracaena'], icon: '🌲', intervalDays: 9, daysUntilWatering: 0 },
  { names: ['Лаванда', 'Lavender'], icon: '🪻', intervalDays: 7, daysUntilWatering: 7 },
  { names: ['Роза', 'Rose'], icon: '🌹', intervalDays: 5, daysUntilWatering: 5 },
  { names: ['Подсолнух', 'Sunflower'], icon: '🌻', intervalDays: 4, daysUntilWatering: 4 },
  { names: ['Пальма', 'Palm'], icon: '🌴', intervalDays: 10, daysUntilWatering: 10 },
  { names: ['Бамбук', 'Bamboo'], icon: '🎋', intervalDays: 6, daysUntilWatering: 6 },
  { names: ['Тюльпан', 'Tulip'], icon: '🌷', intervalDays: 3, daysUntilWatering: 3 },
  { names: ['Клевер', 'Clover'], icon: '☘️', intervalDays: 8, daysUntilWatering: 8 },
  { names: ['Спатифиллум', 'Peace lily'], icon: '🪴', intervalDays: 6, daysUntilWatering: 0 },
  { names: ['Хлорофитум', 'Spider plant'], icon: '🌱', intervalDays: 5, daysUntilWatering: 0 },
  { names: ['Пеперомия', 'Peperomia'], icon: '🍃', intervalDays: 7, daysUntilWatering: 0 },
  { names: ['Маранта', 'Prayer plant'], icon: '🌿', intervalDays: 4, daysUntilWatering: 0 },
  { names: ['Толстянка', 'Jade plant'], icon: '🌵', intervalDays: 10, daysUntilWatering: 0 },
];

function addDemoPlants(data: Data, startIndex: number, endIndex: number, version: number): Data {
  const currentDay = today();
  const plants = DEMO_PLANTS.slice(startIndex, endIndex).map(({ names, icon, intervalDays, daysUntilWatering }): Plant => ({
    id: makeId(), name: names[data.language === 'ru' ? 0 : 1], icon, intervalDays,
    createdAt: addDays(currentDay, -30),
    lastWateredAt: addDays(currentDay, daysUntilWatering - intervalDays),
  }));
  const waterings = plants.map((plant): Watering => ({
    id: makeId(), plantId: plant.id, plantName: plant.name, icon: plant.icon, date: plant.lastWateredAt,
  }));
  return { ...data, plants: [...data.plants, ...plants], waterings: [...waterings, ...data.waterings],
    demoSeeded: true, demoSeedVersion: version };
}

function refreshDemoWateringDates(data: Data): Data {
  const updatedDates = new Map<string, string>();
  const plants = data.plants.map(plant => {
    const isDueDemo = DEMO_PLANTS.some(example => example.daysUntilWatering === 0 &&
      example.names.includes(plant.name) && example.icon === plant.icon && example.intervalDays === plant.intervalDays);
    if (!isDueDemo) return plant;
    const history = data.waterings.filter(watering => watering.plantId === plant.id);
    if (history.length !== 1 || history[0].date !== plant.lastWateredAt) return plant;
    const lastWateredAt = addDays(today(), -plant.intervalDays);
    updatedDates.set(plant.id, lastWateredAt);
    return { ...plant, lastWateredAt };
  });
  const waterings = data.waterings.map(watering => updatedDates.has(watering.plantId)
    ? { ...watering, date: updatedDates.get(watering.plantId)! } : watering);
  return { ...data, plants, waterings, demoSeedVersion: 3 };
}

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(initial);
  const dataRef = useRef<Data>(initial);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(async value => {
      const saved = value ? JSON.parse(value) as Partial<Data> : initial;
      const restored: Data = { plants: saved.plants ?? [], waterings: saved.waterings ?? [],
        language: saved.language === 'en' ? 'en' : 'ru', demoSeeded: saved.demoSeeded === true,
        demoSeedVersion: saved.demoSeedVersion ?? (saved.demoSeeded ? 1 : 0) };
      const expanded = restored.demoSeedVersion >= 2 ? restored : addDemoPlants(restored,
        restored.demoSeeded ? LEGACY_DEMO_COUNT : 0, EXPANDED_DEMO_COUNT, 2);
      const refreshed = expanded.demoSeedVersion >= 3 ? expanded : refreshDemoWateringDates(expanded);
      const next = refreshed.demoSeedVersion >= 4 ? refreshed : addDemoPlants(refreshed,
        EXPANDED_DEMO_COUNT, DEMO_PLANTS.length, 4);
      if (next !== restored) await AsyncStorage.setItem(KEY, JSON.stringify(next));
      dataRef.current = next;
      setData(next);
    }).catch(() => setError(true)).finally(() => setReady(true));
  }, []);

  function commit(change: (current: Data) => Data): Promise<void> {
    const operation = pending.current.then(async () => {
      const next = change(dataRef.current);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      dataRef.current = next;
      setData(next);
      setError(false);
    });
    pending.current = operation.catch(() => {});
    return operation.catch(() => { setError(true); throw new Error('save failed'); });
  }

  return <PlantContext.Provider value={{ ...data, ready, error,
    addPlant: (name, icon, intervalDays) => commit(current => ({ ...current,
      plants: [...current.plants, { id: makeId(), name, icon, intervalDays, createdAt: today(), lastWateredAt: '' }] })),
    editPlant: (id, name, icon, intervalDays) => commit(current => ({ ...current,
      plants: current.plants.map(plant => plant.id === id ? { ...plant, name, icon, intervalDays } : plant) })),
    deletePlant: id => commit(current => ({ ...current, plants: current.plants.filter(plant => plant.id !== id),
      waterings: current.waterings.filter(watering => watering.plantId !== id) })),
    waterPlant: id => commit(current => {
      const plant = current.plants.find(item => item.id === id);
      if (!plant || plant.lastWateredAt === today()) return current;
      return { ...current, plants: current.plants.map(item => item.id === id ? { ...item, lastWateredAt: today() } : item),
        waterings: [{ id: makeId(), plantId: id, plantName: plant.name, icon: plant.icon, date: today() }, ...current.waterings] };
    }),
    setLanguage: language => commit(current => ({ ...current, language })),
  }}>{children}</PlantContext.Provider>;
}

export function usePlants() {
  const value = useContext(PlantContext);
  if (!value) throw new Error('PlantProvider missing');
  return value;
}
