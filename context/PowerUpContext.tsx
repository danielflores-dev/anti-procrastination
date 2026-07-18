import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const POWERUPS_KEY = 'antiprocrastination.powerups.v1';

type PowerUpContextType = {
  /** Sessions left with 2x coins. Applies automatically to the next focus session. */
  doubleCharges: number;
  /** Streak shields that auto-bridge one missed study day each. */
  shields: number;
  /** Date keys (YYYY-MM-DD) that a shield already covered. Treated as studied days. */
  bridgedDates: string[];
  /** Treats that put the dog in party mode for one whole session each. */
  dogTreats: number;
  /** One-time purchases: city decorations, dog gear, styles. */
  unlocks: string[];
  addDoubleCharge: () => void;
  consumeDoubleCharge: () => boolean;
  addShield: () => void;
  useShieldFor: (dateKey: string) => boolean;
  addDogTreat: () => void;
  consumeDogTreat: () => boolean;
  addUnlock: (id: string) => void;
};

const PowerUpContext = createContext<PowerUpContextType>({
  doubleCharges: 0,
  shields: 0,
  bridgedDates: [],
  dogTreats: 0,
  unlocks: [],
  addDoubleCharge: () => {},
  consumeDoubleCharge: () => false,
  addShield: () => {},
  useShieldFor: () => false,
  addDogTreat: () => {},
  consumeDogTreat: () => false,
  addUnlock: () => {},
});

export function PowerUpProvider({ children }: { children: ReactNode }) {
  const [doubleCharges, setDoubleCharges] = useState(0);
  const [shields, setShields] = useState(0);
  const [bridgedDates, setBridgedDates] = useState<string[]>([]);
  const [dogTreats, setDogTreats] = useState(0);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(POWERUPS_KEY)
      .then(saved => {
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (Number.isFinite(parsed.doubleCharges)) setDoubleCharges(parsed.doubleCharges);
        if (Number.isFinite(parsed.shields)) setShields(parsed.shields);
        if (Array.isArray(parsed.bridgedDates)) setBridgedDates(parsed.bridgedDates);
        if (Number.isFinite(parsed.dogTreats)) setDogTreats(parsed.dogTreats);
        if (Array.isArray(parsed.unlocks)) setUnlocks(parsed.unlocks);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      POWERUPS_KEY,
      JSON.stringify({ doubleCharges, shields, bridgedDates, dogTreats, unlocks }),
    ).catch(() => {});
  }, [doubleCharges, shields, bridgedDates, dogTreats, unlocks, hydrated]);

  const addDoubleCharge = () => setDoubleCharges(c => c + 1);

  const consumeDoubleCharge = (): boolean => {
    if (doubleCharges <= 0) return false;
    setDoubleCharges(c => c - 1);
    return true;
  };

  const addShield = () => setShields(s => s + 1);

  const useShieldFor = (dateKey: string): boolean => {
    if (shields <= 0 || bridgedDates.includes(dateKey)) return false;
    setShields(s => s - 1);
    setBridgedDates(current => [...current, dateKey]);
    return true;
  };

  const addDogTreat = () => setDogTreats(t => t + 1);

  const consumeDogTreat = (): boolean => {
    if (dogTreats <= 0) return false;
    setDogTreats(t => t - 1);
    return true;
  };

  const addUnlock = (id: string) => {
    setUnlocks(current => current.includes(id) ? current : [...current, id]);
  };

  return (
    <PowerUpContext.Provider value={{
      doubleCharges,
      shields,
      bridgedDates,
      dogTreats,
      unlocks,
      addDoubleCharge,
      consumeDoubleCharge,
      addShield,
      useShieldFor,
      addDogTreat,
      consumeDogTreat,
      addUnlock,
    }}>
      {children}
    </PowerUpContext.Provider>
  );
}

export function usePowerUps() {
  return useContext(PowerUpContext);
}
