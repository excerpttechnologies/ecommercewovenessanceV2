"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { CartView } from "@/lib/cart-server";
import { useUi } from "@/store/ui";

export type CartData = Omit<CartView, "token">;
const KEY = ["cart"];

export function useCart() {
  const qc = useQueryClient();
  const setCartOpen = useUi((s) => s.setCartOpen);
  const query = useQuery({ queryKey: KEY, queryFn: async () => (await api<CartData>("/api/v1/cart")).data });
  const set = (data: CartData) => qc.setQueryData(KEY, data);

  const add = useMutation({
    mutationFn: async (v: { sku: string; qty?: number }) => (await api<CartData>("/api/v1/cart", { method: "POST", json: v })).data,
    onSuccess: (d) => {
      set(d);
      setCartOpen(true);
    },
  });
  const update = useMutation({
    mutationFn: async (v: { sku: string; qty: number }) => (await api<CartData>("/api/v1/cart", { method: "PATCH", json: v })).data,
    onSuccess: set,
  });
  const coupon = useMutation({
    mutationFn: async (code: string | null) =>
      (await api<CartData>("/api/v1/cart/coupon", code ? { method: "POST", json: { code } } : { method: "DELETE" })).data,
    onSuccess: set,
  });
  return { ...query, cart: query.data, add, update, coupon, refresh: () => qc.invalidateQueries({ queryKey: KEY }) };
}

export function useWishlist() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["wishlist"], queryFn: async () => (await api<string[]>("/api/v1/wishlist")).data });
  const toggle = useMutation({
    mutationFn: async (sku: string) => (await api<string[]>("/api/v1/wishlist", { method: "POST", json: { sku } })).data,
    onSuccess: (d) => qc.setQueryData(["wishlist"], d),
  });
  return { skus: query.data ?? [], has: (sku: string) => (query.data ?? []).includes(sku), toggle };
}
