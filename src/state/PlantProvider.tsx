import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { addDays, Plant, today, Watering } from '../domain/plant';

type Data = { plants: Plant[]; waterings: Watering[]; language: 'ru' | 'en' };
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
const initial: Data = { plants: [], waterings: [], language: 'ru' };
const PlantContext = createContext<PlantContextValue | null>(null);
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function isLegacyDemoPlant(plant: Plant): boolean {
  // Demo records used the actual creation timestamp in the ID, but backdated createdAt by 30 days.
  const timestamp = /^(\d{13})-/.exec(plant.id)?.[1];
  if (!timestamp) return false;
  const generatedAt = new Date(Number(timestamp));
  const [year, month, day] = addDays(plant.createdAt, 30).split('-').map(Number);
  return generatedAt.getFullYear() === year && generatedAt.getMonth() + 1 === month && generatedAt.getDate() === day;
}

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(initial);
  const dataRef = useRef<Data>(initial);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(async value => {
      const saved: Partial<Data> & { demoSeeded?: boolean } = value ? JSON.parse(value) : initial;
      const plants = saved.plants ?? [];
      const demoIds = new Set(saved.demoSeeded ? plants.filter(isLegacyDemoPlant).map(plant => plant.id) : []);
      const next: Data = {
        plants: plants.filter(plant => !demoIds.has(plant.id)),
        waterings: (saved.waterings ?? []).filter(watering => !demoIds.has(watering.plantId)),
        language: saved.language === 'en' ? 'en' : 'ru',
      };
      if (saved.demoSeeded) await AsyncStorage.setItem(KEY, JSON.stringify(next));
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
