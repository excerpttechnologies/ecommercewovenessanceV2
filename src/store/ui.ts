"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  cartOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  currency: string;
  storeId?: string;
  setCartOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  setCurrency: (c: string) => void;
  setStoreId: (id?: string) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      cartOpen: false,
      searchOpen: false,
      menuOpen: false,
      currency: "INR",
      storeId: undefined,
      setCartOpen: (cartOpen) => set({ cartOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setMenuOpen: (menuOpen) => set({ menuOpen }),
      setCurrency: (currency) => set({ currency }),
      setStoreId: (storeId) => set({ storeId }),
    }),
    { name: "we-ui", partialize: (s) => ({ currency: s.currency, storeId: s.storeId }) },
  ),
);
