import { createContext } from 'react';

export const ItemDetailScrollContext = createContext<
  ((windowY: number, height: number) => void) | null
>(null);
