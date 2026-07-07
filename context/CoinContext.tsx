import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const COINS_KEY = 'antiprocrastination.coins.v1';

type CoinContextType = {
  coins: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean; // returns false if not enough
};

const CoinContext = createContext<CoinContextType>({
  coins: 0,
  addCoins: () => {},
  spendCoins: () => false,
});

export function CoinProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(COINS_KEY);
        if (saved) {
          const parsed = Number(saved);
          if (Number.isFinite(parsed) && parsed >= 0) setCoins(parsed);
        }
      } catch {
        // Start fresh if storage is unreadable.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(COINS_KEY, String(coins)).catch(() => {});
  }, [coins, hydrated]);

  const addCoins = (amount: number) => setCoins(c => c + amount);

  const spendCoins = (amount: number): boolean => {
    if (coins < amount) return false;
    setCoins(c => c - amount);
    return true;
  };

  return (
    <CoinContext.Provider value={{ coins, addCoins, spendCoins }}>
      {children}
    </CoinContext.Provider>
  );
}

export function useCoins() {
  return useContext(CoinContext);
}
