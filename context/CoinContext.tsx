import { createContext, useContext, useState } from 'react';

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
