import React, { createContext, useContext, useState, useCallback } from 'react';
import type { DrawerItem } from '../components/DrawerMenu';

type DrawerContextType = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  items: DrawerItem[];
  title: string;
  setDrawerContent: (title: string, items: DrawerItem[]) => void;
};

const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  items: [],
  title: '',
  setDrawerContent: () => {},
});

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<DrawerItem[]>([]);
  const [title, setTitle] = useState('');

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const setDrawerContent = useCallback((t: string, i: DrawerItem[]) => {
    setTitle(t);
    setItems(i);
  }, []);

  return (
    <DrawerContext.Provider value={{ isOpen, open, close, items, title, setDrawerContent }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  return useContext(DrawerContext);
}
