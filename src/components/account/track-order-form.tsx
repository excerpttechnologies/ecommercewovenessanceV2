"use client";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Order } from "@/domain/types";
import { api } from "@/hooks/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { OrderTimeline, orderTone } from "@/components/account/order-status";

export function TrackOrderForm({ initialOrderNo, initialPhone }: { initialOrderNo: string; initialPhone: string }) {
  const [orderNo, setOrderNo] = useState(initialOrderNo);
  const [phone, setPhone] = useState(initialPhone);
  const lookup = useMutation({
    mutationFn: async (values: { orderNo: string; phone: string }) => {
      const qs = new URLSearchParams({ phone: values.phone });
      return (await api<Order>(`/api/v1/orders/${encodeURIComponent(values.orderNo)}?${qs}`)).data;
    },
  });

  useEffect(() => {
    if (initialOrderNo && initialPhone) lookup.mutate({ orderNo: initialOrderNo, phone: initialPhone });
  }, [initialOrderNo, initialPhone, lookup.mutate]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    lookup.mutate({ orderNo: orderNo.trim(), phone: phone.trim() });
  };
  const order = lookup.data;

  return (
    <div>
      <form onSubmit={submit} className="grid gap-4 rounded-sm border border-line bg-white/60 p-5 sm:grid-cols-2">
        <Field label="Order number"><Input required value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder="e.g. WE-2026-0001" /></Field>
        <Field label="Checkout phone number"><Input required type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number used at checkout" /></Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={lookup.isPending}>Track order</Button>
        </div>
        {lookup.error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{(lookup.error as Error).message}</p>}
      </form>

      {order && <section aria-live="polite" className="mt-6 border-t border-line pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-muted">Order</p><h2 className="text-2xl">{order.orderNo}</h2></div>
          <Badge tone={orderTone(order.orderStatus)}>{order.orderStatus}</Badge>
        </div>
        <div className="mt-5 overflow-x-auto pb-2"><OrderTimeline status={order.orderStatus} /></div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <p><span className="text-muted">Placed:</span> {order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "—"}</p>
          <p><span className="text-muted">Payment:</span> {order.paymentStatus} · {order.paymentMode}</p>
          <p><span className="text-muted">Delivering to:</span> {order.shippingAddress.city}</p>
          {order.awbNo && <p><span className="text-muted">Tracking / AWB:</span> {order.awbNo}</p>}
        </div>
        <p className="mt-4 text-xs text-muted">{order.items.length} item(s) in this order.</p>
      </section>}
    </div>
  );
}
