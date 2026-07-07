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
  addDoubleCharge: () => void;
  consumeDoubleCharge: () => boolean;
  addShield: () => void;
  useShieldFor: (dateKey: string) => boolean;
};

const PowerUpContext = createContext<PowerUpContextType>({
  doubleCharges: 0,
  shields: 0,
  bridgedDates: [],
  addDoubleCharge: () => {},
  consumeDoubleCharge: () => false,
  addShield: () => {},
  useShieldFor: () => false,
});

export function PowerUpProvider({ children }: { children: ReactNode }) {
  const [doubleCharges, setDoubleCharges] = useState(0);
  const [shields, setShields] = useState(0);
  const [bridgedDates, setBridgedDates] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(POWERUPS_KEY)
      .then(saved => {
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (Number.isFinite(parsed.doubleCharges)) setDoubleCharges(parsed.doubleCharges);
        if (Number.isFinite(parsed.shields)) setShields(parsed.shields);
        if (Array.isArray(parsed.bridgedDates)) setBridgedDates(parsed.bridgedDates);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(POWERUPS_KEY, JSON.stringify({ doubleCharges, shields, bridgedDates })).catch(() => {});
  }, [doubleCharges, shields, bridgedDates, hydrated]);

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

  return (
    <PowerUpContext.Provider value={{ doubleCharges, shields, bridgedDates, addDoubleCharge, consumeDoubleCharge, addShield, useShieldFor }}>
      {children}
    </PowerUpContext.Provider>
  );
}

export function usePowerUps() {
  return useContext(PowerUpContext);
}
