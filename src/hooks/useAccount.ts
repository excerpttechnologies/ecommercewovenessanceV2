// FILE: src/hooks/useAccount.ts   (NEW FILE)
// ADDED: interface AccountSummary, hook useAccount() - one cached GET /api/v1/account/summary (profile + liked products + recent orders).
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export interface AccountSummary {
  loggedIn: boolean;
  customer: { name: string; email: string | null; mobile: string | null; loyaltyPoints: number } | null;
  wishlist: { sku: string; name: string; price: number; mrp: number; image?: string; href: string }[];
  orders: { orderNo: string; createdAt: string | null; itemCount: number; total: number; status: string; name: string; image: string | null }[];
  orderTotal: number;
}

/** Profile + liked products + recent orders in one cached request (shared by every navbar menu). */
export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: async () => (await api<AccountSummary>("/api/v1/account/summary")).data,
    staleTime: 60_000,
  });
}
