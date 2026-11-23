"use client";
import { create } from "zustand";

export interface ToastAction {
  label: string;
  /** May return a promise; the toaster keeps the toast open until it settles. */
  onClick: () => void | Promise<unknown>;
}

export interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
  duration: number;
}

interface ShowToastInput {
  message: string;
  action?: ToastAction;
  /** Defaults to 5 seconds, as required for Undo. */
  duration?: number;
}

interface ToastState {
  toast: ToastItem | null;
  show: (input: ShowToastInput) => void;
  dismiss: (id?: number) => void;
}

let nextId = 1;

/** Tiny in-house toast queue (single toast). No third-party dependency. */
export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: ({ message, action, duration = 5000 }) => set({ toast: { id: nextId++, message, action, duration } }),
  dismiss: (id) => set((state) => (!id || state.toast?.id === id ? { toast: null } : state)),
}));
