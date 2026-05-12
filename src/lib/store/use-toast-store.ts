import { create } from "zustand";
import { ToastType } from "@/components/ui/toast";

interface ToastState {
  message: string | null;
  type: ToastType;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: "success",
  showToast: (message, type = "success") => set({ message, type }),
  hideToast: () => set({ message: null }),
}));
