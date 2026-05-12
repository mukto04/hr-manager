import { create } from "zustand";

interface NavigationState {
  isNavigating: boolean;
  setIsNavigating: (val: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  setIsNavigating: (val) => set({ isNavigating: val }),
}));
