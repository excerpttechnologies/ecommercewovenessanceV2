// "use client";
// import Image from "next/image";
// import Link from "next/link";
// import { ArrowRight, BadgeCheck, Banknote, Building2, Check, ChevronDown, ChevronRight, CreditCard, Hash, Home, Lock, Mail, MapPin, Minus, Package, Phone, Plus, ShieldCheck, ShoppingBag, Ticket, Trash2, User } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { useState } from "react";
// import type { Address } from "@/domain/types";
// import { api, ApiError } from "@/hooks/api";
// import { useCart } from "@/hooks/useCart";
// import { formatMoney } from "@/lib/currency";
// import { Button } from "@/components/ui/button";
// import { Input, Select } from "@/components/ui/input";
// import { useUi } from "@/store/ui";
// import { cn, isRemoteImageSource } from "@/lib/utils";

// const STATES = ["Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

// interface Props {
//   customer: { name: string; mobile: string; email?: string; addresses: Address[] } | null;
//   codEnabled: boolean;
//   razorpayEnabled: boolean;
//   razorpayConfigured: boolean;
// }

// export function CheckoutForm({ customer, codEnabled, razorpayEnabled, razorpayConfigured }: Props) {
//   const { cart, refresh, update, coupon } = useCart();
//   const currency = useUi((s) => s.currency);
//   const router = useRouter();
//   const def = customer?.addresses.find((a) => a.isDefault) ?? customer?.addresses[0];
//   const [addr, setAddr] = useState<Address>(def ?? { name: customer?.name ?? "", phone: customer?.mobile ?? "", line1: "", line2: "", city: "", state: "Karnataka", pincode: "", country: "India" });
//   const [email, setEmail] = useState(customer?.email ?? "");
//   const [mode, setMode] = useState<"COD" | "RAZORPAY">(codEnabled ? "COD" : "RAZORPAY");
//   const [onlineChoice, setOnlineChoice] = useState<OnlinePaymentChoice>({ option: "upi_apps" });
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [pendingPayment, setPendingPayment] = useState<{ orderId: string; paymentId: string; signature: string } | null>(null);
//   const [placed, setPlaced] = useState<string | null>(null);
//   const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const value = k === "pincode"
//       ? e.target.value.replace(/\D/g, "").slice(0, 6)
//       : k === "phone"
//         ? e.target.value.replace(/\D/g, "").slice(0, 10)
//         : e.target.value;
//     setAddr({ ...addr, [k]: value });
//   };

//   async function submit(e: React.FormEvent) {
//     e.preventDefault();
//     setBusy(true);
//     setError(null);
//     try {
//       const body = { address: addr, paymentMode: mode, email: email || undefined };
//       if (mode === "RAZORPAY" && pendingPayment) {
//         const confirmed = (await api<{ orderNo: string }>("/api/v1/checkout", {
//           method: "POST",
//           json: { ...body, payment: pendingPayment },
//         })).data;
//         setPendingPayment(null);
//         return finish(confirmed.orderNo);
//       }
//       const first = (await api<{ step: string; orderNo?: string; gateway?: { gatewayOrderId: string; amount: number; keyId: string } }>("/api/v1/checkout", { method: "POST", json: body })).data;
//       if (first.step === "done") return finish(first.orderNo!);
//       const gw = first.gateway!;
//       const payment = await openRazorpay(gw, addr, email, onlineChoice);
//       setPendingPayment(payment);
//       const second = (await api<{ step: string; orderNo: string }>("/api/v1/checkout", { method: "POST", json: { ...body, payment } })).data;
//       setPendingPayment(null);
//       finish(second.orderNo);
//     } catch (err) {
//       setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
//       setBusy(false);
//     }
//   }
//   function finish(orderNo: string) {
//     const href = `/checkout/success/${orderNo}`;
//     refresh();
//     router.prefetch(href);
//     // Celebrate briefly, then continue to the same success page as before.
//     setPlaced(orderNo);
//     window.setTimeout(() => router.push(href), 2800);
//   }

//   if (placed) return <OrderPlacedDialog orderNo={placed} onContinue={() => router.push(`/checkout/success/${placed}`)} />;

//   if (!cart) return <p className="mt-8 text-sm text-muted">Loading…</p>;
//   if (!cart.lines.length) {
//     return (
//       <div className="mt-8 flex flex-col items-center rounded-xl border border-line bg-white px-6 py-14 text-center">
//         <span className="flex h-14 w-14 items-center justify-center rounded-full bg-maroon/10 text-maroon"><ShoppingBag className="h-6 w-6" /></span>
//         <p className="mt-4 font-display text-2xl">Your bag is empty</p>
//         <Link href="/collections/sarees" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-maroon px-6 text-sm font-semibold text-white hover:bg-gold">Shop sarees <ArrowRight className="h-4 w-4" /></Link>
//       </div>
//     );
//   }
//   const t = cart.totals;
//   const itemCount = cart.lines.reduce((n, l) => n + l.qty, 0);
//   // Progress for the step bar: the address is "done" once the required fields look valid.
//   const addressDone = Boolean(addr.name?.trim() && /^[6-9]\d{9}$/.test(addr.phone ?? "") && addr.line1.trim() && addr.city.trim() && /^[1-9]\d{5}$/.test(addr.pincode));
//   const step = addressDone ? 2 : 1;

//   return (
//     <form onSubmit={submit} className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
//       <div className="min-w-0 space-y-5">
//         <Steps step={step} />

//         {!customer && (
//           <p className="flex items-start gap-2 rounded-xl border border-maroon/15 bg-maroon/[0.04] px-4 py-3 text-xs text-ink/75">
//             <User className="mt-0.5 h-4 w-4 shrink-0 text-maroon" />
//             <span>Checking out as guest. <Link href="/login?next=/checkout" className="font-semibold text-maroon underline">Log in</Link> or <Link href="/register?next=/checkout" className="font-semibold text-maroon underline">create an account</Link> to use saved addresses and track orders.</span>
//           </p>
//         )}

//         <Card icon={MapPin} title="Delivery address" subtitle="Where should we deliver your order?">
//           {customer && customer.addresses.length > 0 && (
//             <div className="mb-5">
//               <p className="mb-2 text-xs font-semibold text-ink/70">Saved addresses</p>
//               <div className="grid gap-2 sm:grid-cols-2">
//                 {customer.addresses.map((a, i) => {
//                   const on = a.line1 === addr.line1 && a.pincode === addr.pincode;
//                   return (
//                     <button type="button" key={i} onClick={() => setAddr(a)} aria-pressed={on} className={cn("rounded-lg border p-3 text-left text-xs transition-colors", on ? "border-maroon bg-maroon/[0.05] ring-1 ring-maroon" : "border-line hover:border-maroon/50")}>
//                       <p className="flex items-center justify-between font-semibold text-olive">{a.name}{on && <Check className="h-4 w-4 text-maroon" />}</p>
//                       <p className="mt-0.5 text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.pincode}</p>
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>
//           )}
//           <div className="grid gap-4 sm:grid-cols-2">
//             <IconField label="Full name" required icon={User}><Input required value={addr.name ?? ""} onChange={set("name")} placeholder="Enter your full name" autoComplete="name" className={iconInput} /></IconField>
//             <IconField label="Mobile number" required icon={Phone}><Input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={addr.phone ?? ""} onChange={set("phone")} placeholder="10-digit mobile number" autoComplete="tel-national" className={iconInput} /></IconField>
//             <div className="sm:col-span-2"><IconField label="Email (for order updates)" icon={Mail}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" autoComplete="email" className={iconInput} /></IconField></div>
//             <div className="sm:col-span-2"><IconField label="Address line 1" required icon={Home}><Input required value={addr.line1} onChange={set("line1")} placeholder="House number, building, street name" autoComplete="address-line1" className={iconInput} /></IconField></div>
//             <div className="sm:col-span-2"><IconField label="Address line 2" icon={Home}><Input value={addr.line2 ?? ""} onChange={set("line2")} placeholder="Apartment, landmark, area (optional)" autoComplete="address-line2" className={iconInput} /></IconField></div>
//             <IconField label="City" required icon={Building2}><Input required value={addr.city} onChange={set("city")} placeholder="Enter city" autoComplete="address-level2" className={iconInput} /></IconField>
//             <IconField label="State" required icon={MapPin}><Select value={addr.state} onChange={set("state")} autoComplete="address-level1" className={iconInput}>{STATES.map((s) => <option key={s}>{s}</option>)}</Select></IconField>
//             <IconField label="Pincode" required icon={Hash}><Input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} title="Enter a valid 6-digit Indian PIN code" value={addr.pincode} onChange={set("pincode")} placeholder="6-digit pincode" autoComplete="postal-code" className={iconInput} /></IconField>
//           </div>
//         </Card>

//         <Card icon={CreditCard} title="Payment" subtitle="Choose your preferred payment method">
//           <div className="grid gap-2.5" role="radiogroup" aria-label="Choose a payment method">
//             <PayOption
//               selected={mode === "RAZORPAY"}
//               disabled={!razorpayEnabled}
//               onChange={() => setMode("RAZORPAY")}
//               icon={CreditCard}
//               title="Pay online"
//               badges
//               text={razorpayEnabled
//                 ? razorpayConfigured
//                   ? "UPI, cards and netbanking · Secure checkout by Razorpay"
//                   : "UPI, cards and netbanking · Payment setup required before checkout"
//                 : !razorpayConfigured
//                   ? "Currently unavailable · Online payments need to be configured by the store"
//                   : "Online payments are not enabled by the store"}
//             />
//             {mode === "RAZORPAY" && (
//               <OnlinePaymentMethods configured={razorpayConfigured} choice={onlineChoice} onSelect={setOnlineChoice} />
//             )}
//             <PayOption selected={mode === "COD"} disabled={!codEnabled || !!pendingPayment} onChange={() => setMode("COD")} icon={Banknote} title="Cash on delivery" text="Pay when your order arrives at your doorstep" />
//           </div>
//           {pendingPayment && <p role="status" className="mt-2 text-xs text-olive">Payment received. If order confirmation did not finish, submit again to confirm it. Do not pay again.</p>}
//           {!codEnabled && !razorpayEnabled && <p role="alert" className="mt-2 text-xs text-red-700">No payment methods are currently available. Please contact the store.</p>}
//         </Card>
//       </div>

//       <aside className="rounded-xl border border-line bg-white p-5 shadow-[0_18px_40px_-30px_rgba(122,18,56,0.5)] lg:sticky lg:top-36">
//         <div className="flex items-center justify-between">
//           <h2 className="flex items-center gap-2.5 font-display text-2xl font-medium">
//             <span className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon/10 text-maroon"><ShoppingBag className="h-4 w-4" /></span>
//             Your order
//           </h2>
//           <span className="text-sm text-muted">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
//         </div>
//         <ul className="mt-4 space-y-2.5">
//           {cart.lines.map((l) => {
//             const max = Math.min(20, l.product.stock.qty || 1);
//             return (
//               <li key={l.sku} className="flex gap-3 rounded-lg border border-line p-2.5">
//                 <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-line">{l.product.images[0] && <Image src={l.product.images[0]} alt="" fill unoptimized={isRemoteImageSource(l.product.images[0])} sizes="56px" className="object-cover" />}</span>
//                 <span className="flex min-w-0 flex-1 flex-col">
//                   <span className="flex items-start justify-between gap-2">
//                     <span className="line-clamp-1 text-sm font-semibold text-olive">{l.product.name}</span>
//                     <span className="shrink-0 text-sm font-semibold">{formatMoney(l.product.pricing.sellingPrice * l.qty, currency)}</span>
//                   </span>
//                   <span className="mt-auto flex items-center justify-between pt-1.5">
//                     <span className="flex h-7 items-center rounded-md border border-line">
//                       <button type="button" aria-label={`Decrease ${l.product.name}`} disabled={l.qty <= 1 || update.isPending || busy} onClick={() => update.mutate({ sku: l.sku, qty: l.qty - 1 })} className="flex h-7 w-7 items-center justify-center text-olive disabled:opacity-30"><Minus className="h-3 w-3" /></button>
//                       <span className="w-6 text-center text-xs font-semibold"><span key={l.qty} className="we-pop">{l.qty}</span></span>
//                       <button type="button" aria-label={`Increase ${l.product.name}`} disabled={l.qty >= max || update.isPending || busy} onClick={() => update.mutate({ sku: l.sku, qty: l.qty + 1 })} className="flex h-7 w-7 items-center justify-center text-olive disabled:opacity-30"><Plus className="h-3 w-3" /></button>
//                     </span>
//                     <button type="button" aria-label={`Remove ${l.product.name}`} disabled={update.isPending || busy} onClick={() => update.mutate({ sku: l.sku, qty: 0 })} className="flex h-7 w-7 items-center justify-center rounded-md text-maroon hover:bg-maroon/10 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
//                   </span>
//                 </span>
//               </li>
//             );
//           })}
//         </ul>

//         <CouponBox applied={cart.couponCode} pending={coupon.isPending} error={coupon.isError ? (coupon.error as Error).message : null} onApply={(code) => coupon.mutate(code)} onRemove={() => coupon.mutate(null)} />

//         <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
//           <div className="flex justify-between"><dt className="text-ink/75">Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</dt><dd>{formatMoney(t.subTotal, currency)}</dd></div>
//           {t.couponDiscount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon {cart.couponCode}</dt><dd>− {formatMoney(t.couponDiscount, currency)}</dd></div>}
//           <div className="flex justify-between"><dt className="text-ink/75">Shipping</dt><dd>{t.shippingCharge ? formatMoney(t.shippingCharge, currency) : <span className="font-semibold text-emerald-700">Free</span>}</dd></div>
//           <div className="flex items-end justify-between border-t border-line pt-3">
//             <dt className="text-base font-semibold">Total amount</dt>
//             <dd className="text-right"><span className="block text-2xl font-bold text-maroon">{formatMoney(t.netAmount, currency)}</span><span className="text-[11px] text-muted">Inclusive of all taxes</span></dd>
//           </div>
//         </dl>
//         {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-800">{error}</p>}
//         <Button type="submit" size="lg" className="mt-5 h-12 w-full rounded-full shadow-[0_12px_26px_-12px_rgba(219,26,114,0.9)]" loading={busy} disabled={!codEnabled && !razorpayEnabled}>
//           {pendingPayment ? "Confirm paid order" : mode === "COD" ? "Place order" : `Pay ${formatMoney(t.netAmount, "INR")}`}
//           {!busy && <ArrowRight className="h-4 w-4" />}
//         </Button>
//         <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted"><Lock className="h-3 w-3" /> Orders are billed in INR. By placing an order you agree to our policies.</p>
//         <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center text-[11px] text-ink/70">
//           <li className="flex flex-col items-center gap-1"><ShieldCheck className="h-5 w-5 text-maroon" />Secure payment</li>
//           <li className="flex flex-col items-center gap-1"><Package className="h-5 w-5 text-maroon" />Careful packaging</li>
//           <li className="flex flex-col items-center gap-1"><BadgeCheck className="h-5 w-5 text-maroon" />Genuine weaves</li>
//         </ul>
//       </aside>
//     </form>
//   );
// }

// const iconInput = "h-11 rounded-lg pl-10";

// const CONFETTI = [
//   ["-90px", "-70px", "220deg", "#db1a72"], ["80px", "-80px", "-160deg", "#e8c27a"], ["-110px", "10px", "120deg", "#f48fb6"],
//   ["105px", "20px", "-200deg", "#db1a72"], ["-60px", "-110px", "300deg", "#e8c27a"], ["55px", "-115px", "-260deg", "#f48fb6"],
//   ["-30px", "90px", "180deg", "#c2185b"], ["40px", "85px", "-120deg", "#e8c27a"],
// ] as const;

// /** Shown for a moment after a successful order, before the success page loads. */
// function OrderPlacedDialog({ orderNo, onContinue }: { orderNo: string; onContinue: () => void }) {
//   return (
//     <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="order-placed-title">
//       <div className="we-modal-in relative w-full max-w-sm overflow-hidden rounded-2xl bg-white px-6 pb-7 pt-9 text-center shadow-2xl">
//         <div className="relative mx-auto h-24 w-24">
//           <span aria-hidden className="we-ring absolute inset-0 rounded-full bg-emerald-400/30" />
//           {CONFETTI.map(([x, y, r, color], i) => (
//             <span key={i} aria-hidden className="we-confetti absolute left-1/2 top-1/2 h-2 w-2 rounded-[2px]" style={{ background: color, "--x": x, "--y": y, "--r": r } as React.CSSProperties} />
//           ))}
//           <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 shadow-[0_12px_30px_-10px_rgba(16,185,129,0.8)]">
//             <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12" aria-hidden>
//               <path className="we-draw" d="M5 12.5l4.2 4.2L19 7" />
//             </svg>
//           </span>
//         </div>
//         <h2 id="order-placed-title" className="mt-6 font-display text-3xl font-medium">Order placed!</h2>
//         <p className="mt-2 text-sm text-muted">Thank you for shopping with Woven Essence. Your order <span className="font-semibold text-olive">#{orderNo}</span> is confirmed.</p>
//         <button type="button" onClick={onContinue} autoFocus className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-maroon text-sm font-semibold text-white hover:bg-gold">
//           View my order <ArrowRight className="h-4 w-4" />
//         </button>
//         <p className="mt-3 text-[11px] text-muted">Taking you to your order details…</p>
//       </div>
//     </div>
//   );
// }

// /** Labelled field with a leading icon inside the control. */
// function IconField({ label, required, icon: Icon, children }: { label: string; required?: boolean; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
//   return (
//     <label className="block">
//       <span className="mb-1.5 block text-xs font-semibold text-ink/80">{label}{required && <span className="text-maroon"> *</span>}</span>
//       <span className="relative block">
//         <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
//         {children}
//       </span>
//     </label>
//   );
// }

// function Card({ icon: Icon, title, subtitle, children }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; children: React.ReactNode }) {
//   return (
//     <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
//       <div className="mb-5 flex items-center gap-3">
//         <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-maroon/10 text-maroon"><Icon className="h-5 w-5" /></span>
//         <div>
//           <h2 className="font-display text-xl font-medium">{title}</h2>
//           <p className="text-xs text-muted">{subtitle}</p>
//         </div>
//       </div>
//       {children}
//     </section>
//   );
// }

// /** Address → Payment → Review. Display only; the form itself stays one page. */
// function Steps({ step }: { step: 1 | 2 }) {
//   const items = [
//     { icon: MapPin, title: "Address", text: "Delivery details" },
//     { icon: CreditCard, title: "Payment", text: "Choose a method" },
//     { icon: Check, title: "Review", text: "Place your order" },
//   ];
//   return (
//     <ol className="we-scroller flex items-center gap-2 overflow-x-auto rounded-xl border border-line bg-white px-4 py-3 sm:justify-between sm:px-5">
//       {items.map(({ icon: Icon, title, text }, i) => {
//         const n = i + 1;
//         const done = n < step;
//         const current = n === step;
//         return (
//           <li key={title} className="flex shrink-0 items-center gap-2.5">
//             <span className={cn("flex h-9 w-9 items-center justify-center rounded-full border transition-colors", current ? "border-maroon bg-maroon text-white shadow-[0_6px_14px_-6px_rgba(219,26,114,0.8)]" : done ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-line text-muted")}>
//               {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
//             </span>
//             <span>
//               <span className={cn("block text-sm font-semibold", current ? "text-olive" : "text-ink/70")}>{title}</span>
//               <span className="block text-[11px] text-muted">{text}</span>
//             </span>
//             {n < items.length && <ChevronRight className="ml-1 hidden h-4 w-4 text-muted/60 sm:block lg:ml-6" />}
//           </li>
//         );
//       })}
//     </ol>
//   );
// }

// /** Collapsible coupon entry. Buttons (not a nested form), since it lives inside the checkout form. */
// function CouponBox({ applied, pending, error, onApply, onRemove }: { applied?: string; pending: boolean; error: string | null; onApply: (code: string) => void; onRemove: () => void }) {
//   const [open, setOpen] = useState(Boolean(applied));
//   const [code, setCode] = useState("");
//   const apply = () => { if (code.trim()) onApply(code.trim().toUpperCase()); };
//   return (
//     <div className="mt-4 rounded-lg border border-maroon/20 bg-maroon/[0.04]">
//       <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
//         <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-maroon"><Ticket className="h-4 w-4" /></span>
//         <span className="min-w-0 flex-1">
//           <span className="block text-sm font-semibold text-olive">{applied ? `Coupon ${applied} applied` : "Have a coupon code?"}</span>
//           <span className="block text-[11px] text-muted">{applied ? "Discount added to your order" : "Get extra discount on your order"}</span>
//         </span>
//         <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
//       </button>
//       {open && (
//         <div className="px-3.5 pb-3.5">
//           <div className="flex gap-2">
//             <Input placeholder="Enter coupon code" value={applied ?? code} disabled={!!applied} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }} className="h-10 bg-white uppercase" />
//             {applied
//               ? <Button type="button" variant="outline" className="h-10" onClick={onRemove} loading={pending}>Remove</Button>
//               : <Button type="button" variant="secondary" className="h-10" onClick={apply} loading={pending}>Apply</Button>}
//           </div>
//           {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
//         </div>
//       )}
//     </div>
//   );
// }

// const ONLINE_PAYMENT_METHODS = [
//   { option: "upi_apps", method: "upi", label: "UPI apps", detail: "Choose from the UPI apps available in secure Razorpay checkout" },
//   { option: "wallet", method: "wallet", label: "Wallets", detail: "Choose from wallets enabled for the store" },
//   { option: "card", method: "card", label: "Debit / Credit cards", detail: "Visa, Mastercard, RuPay and other supported cards" },
//   { option: "netbanking", method: "netbanking", label: "Net banking", detail: "Choose your bank below" },
// ] as const;

// const BANKS = [
//   { name: "State Bank of India", code: "SBIN" },
//   { name: "HDFC Bank", code: "HDFC" },
//   { name: "ICICI Bank", code: "ICIC" },
//   { name: "Axis Bank", code: "UTIB" },
//   { name: "Bank of Baroda", code: "BARB" },
//   { name: "Canara Bank", code: "CNRB" },
//   { name: "Central Bank of India", code: "CBIN" },
//   { name: "Federal Bank", code: "FDRL" },
//   { name: "IDBI Bank", code: "IBKL" },
//   { name: "Indian Bank", code: "IDIB" },
//   { name: "Indian Overseas Bank", code: "IOBA" },
//   { name: "IndusInd Bank", code: "INDB" },
//   { name: "Kotak Mahindra Bank", code: "KKBK" },
//   { name: "Punjab National Bank", code: "PUNB" },
//   { name: "RBL Bank", code: "RATN" },
//   { name: "Union Bank of India", code: "UBIN" },
//   { name: "Yes Bank", code: "YESB" },
// ];

// type OnlineOption = "upi_apps" | "wallet" | "card" | "netbanking";
// type UpiAppChoice = "gpay" | "phonepe" | "paytm" | "razorpay";
// type OnlinePaymentChoice = { option: OnlineOption; bank?: string; upiApp?: UpiAppChoice };

// function OnlinePaymentMethods({
//   configured,
//   choice,
//   onSelect,
// }: {
//   configured: boolean;
//   choice: OnlinePaymentChoice;
//   onSelect: (choice: OnlinePaymentChoice) => void;
// }) {
//   const [showAllBanks, setShowAllBanks] = useState(false);
//   const [expanded, setExpanded] = useState<OnlineOption | null>("upi_apps");
//   const visibleBanks = showAllBanks ? BANKS : BANKS.slice(0, 4);

//   return (
//     <div className="overflow-hidden rounded-lg border border-gold/70 bg-white/70">
//       <p className="border-b border-line bg-ivory px-4 py-3 text-xs text-muted">
//         {configured
//           ? "Choose how you would like to pay online"
//           : "Choose an option now; payment will be available after the store configures Razorpay"}
//       </p>
//       <ul className="divide-y divide-line">
//         {ONLINE_PAYMENT_METHODS.map((method) => {
//           const isExpanded = expanded === method.option;
//           const isSelected = choice.option === method.option;
//           return (
//             <li key={method.option}>
//               <div className="flex items-center gap-2 px-4 py-3 transition-colors hover:bg-ivory/70">
//                 <button
//                   type="button"
//                   role="radio"
//                   aria-checked={isSelected}
//                   onClick={() => {
//                     onSelect({ option: method.option });
//                     setExpanded(isExpanded ? null : method.option);
//                   }}
//                   className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm"
//                 >
//                   <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${isSelected ? "bg-maroon text-white" : "bg-maroon/10 text-maroon"}`}>
//                     {method.method === "card" ? "CARD" : method.method === "netbanking" ? "BANK" : method.method === "wallet" ? "WAL" : "UPI"}
//                   </span>
//                   <span>
//                     <span className="block">{method.label}</span>
//                     {method.option === "upi_apps" && <span className="block text-xs text-muted">Google Pay, PhonePe, Paytm and more</span>}
//                   </span>
//                   <span aria-hidden="true" className={`ml-auto h-5 w-5 shrink-0 rounded-full border ${isSelected ? "border-[6px] border-olive" : "border-2 border-muted"}`} />
//                 </button>
//                 {method.method === "netbanking" && (
//                   <button
//                     type="button"
//                     aria-label={`${isExpanded ? "Collapse" : "Expand"} bank list`}
//                     aria-expanded={isExpanded}
//                     onClick={() => {
//                       if (!isSelected) onSelect({ option: "netbanking" });
//                       setExpanded(isExpanded ? null : method.option);
//                     }}
//                     className="rounded-lg p-1 text-muted hover:bg-white"
//                   >
//                     <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
//                   </button>
//                 )}
//               </div>
//               {isExpanded && method.option !== "netbanking" && (
//                 <div className="bg-ivory/50 py-3 pl-[60px] pr-4 text-xs text-muted">
//                   <div className="flex flex-col gap-2">
//                     <span>{method.detail}</span>
//                     {method.option === "upi_apps" && (
//                       <div className="flex flex-wrap items-center gap-2" aria-label="Choose a UPI checkout preference">
//                         <button
//                           type="button"
//                           aria-pressed={isSelected && choice.upiApp === "gpay"}
//                           onClick={() => onSelect({ option: "upi_apps", upiApp: "gpay" })}
//                           className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-[11px] font-medium text-ink ${isSelected && choice.upiApp === "gpay" ? "border-olive ring-1 ring-olive" : "border-line hover:border-olive"}`}
//                         >
//                           <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5" fill="none">
//                             <path d="M14.2 5.8 26 12.6c3.8 2.2 5.1 7.1 2.9 10.9L17.4 43l-7.2-4.1C4.7 36 2.6 30.4 4 24.3l3-13.1c.8-3.6 4.1-6.1 7.2-5.4Z" fill="#4285F4" />
//                             <path d="m25.1 4.6 8.3 4.8c7.5 4.3 10.1 14 5.8 21.5l-4.2 7.3-8-4.6c-3.9-2.2-5.2-7.2-2.9-11.1l2.8-4.8c1.3-2.3.5-5.2-1.8-6.5l-7.2-4.1c2.1-2.9 4.5-3.9 7.2-2.5Z" fill="#34A853" />
//                             <path d="m35.7 8.9 4.2 2.4c6.9 4 9.3 12.8 5.3 19.7l-4.5 7.8c-2 3.5-6.5 4.7-10 2.7l-6.4-3.7 8.4-14.5c2.3-4 2.1-8.9-.5-12.6l3.5-1.8Z" fill="#EA4335" />
//                             <path d="m12.4 30.7 4.9-8.5 6.5 3.7c3.9 2.3 8.9 1 11.2-2.9l.7-1.2c2.3 3.6 2.5 8.3.3 12.1l-5.2 9c-4.1 7.1-13.2 9.5-20.3 5.4l-.1-.1c-7.1-4.1-9.5-13.2-5.4-20.3l.4-.7c.5 1.5 1.5 2.7 3 3.5l4 2.3Z" fill="#FBBC04" />
//                           </svg>
//                           GPay
//                         </button>
//                         <button
//                           type="button"
//                           aria-pressed={isSelected && choice.upiApp === "phonepe"}
//                           onClick={() => onSelect({ option: "upi_apps", upiApp: "phonepe" })}
//                           className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-[11px] font-medium text-ink ${isSelected && choice.upiApp === "phonepe" ? "border-olive ring-1 ring-olive" : "border-line hover:border-olive"}`}
//                         >
//                           <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-[#5f259f] text-[10px] font-bold text-white">P</span>
//                           PhonePe
//                         </button>
//                         <button
//                           type="button"
//                           aria-pressed={isSelected && choice.upiApp === "paytm"}
//                           onClick={() => onSelect({ option: "upi_apps", upiApp: "paytm" })}
//                           className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-[11px] font-semibold text-[#002970] ${isSelected && choice.upiApp === "paytm" ? "border-olive ring-1 ring-olive" : "border-line hover:border-olive"}`}
//                         >
//                           <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-[#00baf2] text-[8px] font-bold text-white">P</span>
//                           Paytm
//                         </button>
//                         <button
//                           type="button"
//                           aria-pressed={isSelected && choice.upiApp === "razorpay"}
//                           onClick={() => onSelect({ option: "upi_apps", upiApp: "razorpay" })}
//                           className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-[11px] font-medium text-ink ${isSelected && choice.upiApp === "razorpay" ? "border-olive ring-1 ring-olive" : "border-line hover:border-olive"}`}
//                         >
//                           <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-lg bg-[#2b84ea] text-[8px] font-bold text-white">R</span>
//                           Razorpay
//                         </button>
//                       </div>
//                     )}
//                     {method.option === "upi_apps" && (
//                       <span className="text-[11px]">Select an option, then press Pay. GPay and Paytm use Razorpay UPI; PhonePe uses its wallet option when enabled; Razorpay opens UPI checkout.</span>
//                     )}
//                   </div>
//                 </div>
//               )}
//               {isExpanded && method.option === "netbanking" && (
//                 <div className="border-t border-line bg-white/70">
//                   <button
//                     type="button"
//                     role="radio"
//                     aria-checked={isSelected && !choice.bank}
//                     onClick={() => onSelect({ option: "netbanking" })}
//                     className="flex w-full items-center justify-between border-b border-line/70 px-4 py-3 pl-[60px] text-left text-sm hover:bg-ivory/70"
//                   >
//                     <span>Other banks (choose in Razorpay)</span>
//                     <span aria-hidden="true" className={`h-5 w-5 rounded-full border ${isSelected && !choice.bank ? "border-[6px] border-olive" : "border-2 border-muted"}`} />
//                   </button>
//                   {visibleBanks.map((bank) => {
//                     const bankSelected = isSelected && choice.bank === bank.code;
//                     return (
//                       <button
//                         type="button"
//                         key={bank.code}
//                         role="radio"
//                         aria-checked={bankSelected}
//                         onClick={() => onSelect({ option: "netbanking", bank: bank.code })}
//                         className="flex w-full items-center justify-between border-b border-line/70 px-4 py-3 pl-[60px] text-left text-sm hover:bg-ivory/70"
//                       >
//                         <span className="flex items-center gap-3">
//                           <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-sky-100 text-[9px] font-semibold text-sky-800">{bank.code.slice(0, 2)}</span>
//                           {bank.name}
//                         </span>
//                         <span aria-hidden="true" className={`h-5 w-5 rounded-full border ${bankSelected ? "border-[6px] border-olive" : "border-2 border-muted"}`} />
//                       </button>
//                     );
//                   })}
//                   <button
//                     type="button"
//                     onClick={() => setShowAllBanks((value) => !value)}
//                     className="px-4 py-3 pl-[60px] text-xs font-semibold uppercase tracking-wide text-maroon hover:underline"
//                   >
//                     {showAllBanks ? "Show fewer banks" : "View all banks"}
//                   </button>
//                 </div>
//               )}
//             </li>
//           );
//         })}
//       </ul>
//     </div>
//   );
// }

// function PayOption({ selected, disabled = false, onChange, title, text, icon: Icon, badges }: { selected: boolean; disabled?: boolean; onChange: () => void; title: string; text: string; icon: React.ComponentType<{ className?: string }>; badges?: boolean }) {
//   return (
//     <label className={cn("flex items-center gap-3 rounded-lg border p-3.5 text-left transition-colors", selected ? "border-maroon bg-maroon/[0.05] ring-1 ring-maroon" : "border-line hover:border-maroon/40", disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer")}>
//       <input type="radio" name="paymentMode" checked={selected} disabled={disabled} onChange={onChange} className="h-4 w-4 shrink-0 accent-[var(--we-maroon)] disabled:opacity-60" />
//       <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", selected ? "bg-maroon text-white" : "bg-maroon/10 text-maroon")}><Icon className="h-4 w-4" /></span>
//       <span className="min-w-0 flex-1">
//         <span className="block text-sm font-semibold text-ink">{title}</span>
//         <span className="text-xs text-muted">{text}</span>
//       </span>
//       {badges && (
//         <span className="hidden shrink-0 gap-1.5 md:flex" aria-hidden>
//           {["UPI", "VISA", "RuPay"].map((b) => <span key={b} className="rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-extrabold italic text-[#1a1f71]">{b}</span>)}
//         </span>
//       )}
//     </label>
//   );
// }

// declare global { interface Window { Razorpay?: new (o: unknown) => { open: () => void } } }

// /** Loads checkout.js and resolves with the payment triple. */
// function openRazorpay(
//   gw: { gatewayOrderId: string; amount: number; keyId: string },
//   addr: Address,
//   email: string,
//   choice: OnlinePaymentChoice,
// ) {
//   return new Promise<{ orderId: string; paymentId: string; signature: string }>((resolve, reject) => {
//     const run = () => {
//       if (!window.Razorpay) return reject(new Error("Razorpay failed to load"));
//       const selectedMethod = ONLINE_PAYMENT_METHODS.find((method) => method.option === choice.option);
//       if (!selectedMethod) return reject(new Error("Choose a valid online payment method."));
//       const instrument = choice.upiApp === "phonepe"
//         ? { method: "wallet", wallets: ["phonepe"] }
//         : selectedMethod.method === "netbanking" && choice.bank
//           ? { method: "netbanking", banks: [choice.bank] }
//           : { method: selectedMethod.method };
//       const rzp = new window.Razorpay({
//         key: gw.keyId,
//         amount: gw.amount,
//         currency: "INR",
//         order_id: gw.gatewayOrderId,
//         name: "Woven Essence",
//         prefill: { name: addr.name, contact: addr.phone, email },
//         config: {
//           display: {
//             blocks: {
//               selected: {
//                 name: choice.bank
//                   ? `Pay using ${BANKS.find((bank) => bank.code === choice.bank)?.name ?? "selected bank"}`
//                   : selectedMethod.label,
//                 instruments: [instrument],
//               },
//             },
//             sequence: ["block.selected"],
//             preferences: { show_default_blocks: false },
//           },
//         },
//         theme: { color: "#DB1A72" },
//         handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => resolve({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
//         modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
//       });
//       rzp.open();
//     };
//     if (window.Razorpay) return run();
//     const s = document.createElement("script");
//     s.src = "https://checkout.razorpay.com/v1/checkout.js";
//     s.onload = run;
//     s.onerror = () => reject(new Error("Razorpay failed to load"));
//     document.body.appendChild(s);
//   });
// }



//////////////////////////////////////////////////////




"use client";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Address } from "@/domain/types";
import { api, ApiError } from "@/hooks/api";
import { useCart } from "@/hooks/useCart";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useUi } from "@/store/ui";
import { isRemoteImageSource } from "@/lib/utils";

const STATES = ["Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

interface Props {
  customer: { name: string; mobile: string; email?: string; addresses: Address[] } | null;
  codEnabled: boolean;
  razorpayEnabled: boolean;
  razorpayConfigured: boolean;
}

/** Server-computed shipping quote (see /api/v1/shipping/quote). */
interface ShippingQuote {
  serviceable: boolean;
  provider: "shiprocket" | "flat";
  fallback: boolean;
  reason?: string;
  codAvailable: boolean;
  shippingCharge: number;
  baseShippingCharge: number;
  freeShippingApplied: boolean;
  freeShippingThreshold: number;
  etaDays?: number;
  estimatedDelivery?: string;
  couriers: { id: number | string; name: string; rate: number; cod: boolean; etaDays?: number }[];
  selectedCourier?: { id: number | string; name: string; rate: number; cod: boolean; etaDays?: number };
}

export function CheckoutForm({ customer, codEnabled, razorpayEnabled, razorpayConfigured }: Props) {
  const { cart, refresh } = useCart();
  const currency = useUi((s) => s.currency);
  const router = useRouter();
  const def = customer?.addresses.find((a) => a.isDefault) ?? customer?.addresses[0];
  const [addr, setAddr] = useState<Address>(def ?? { name: customer?.name ?? "", phone: customer?.mobile ?? "", line1: "", line2: "", city: "", state: "Karnataka", pincode: "", country: "India" });
  const [email, setEmail] = useState(customer?.email ?? "");
  const [mode, setMode] = useState<"COD" | "RAZORPAY">(codEnabled ? "COD" : "RAZORPAY");
  const [onlineChoice, setOnlineChoice] = useState<OnlinePaymentChoice>({ option: "upi_apps" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ orderId: string; paymentId: string; signature: string } | null>(null);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const cartFingerprint = cart ? `${cart.lines.map((line) => `${line.sku}x${line.qty}`).join(",")}|${cart.totals.couponDiscount}` : "";

  // Live Shiprocket quote for the entered pincode. Recalculates when the pincode,
  // payment mode or the cart changes. The server recomputes the same quote again
  // when the order is placed, so this is display-only.
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(addr.pincode)) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await fetch(`/api/v1/shipping/quote?pin=${addr.pincode}&paymentMode=${mode}`, { signal: controller.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) throw new Error(json?.error?.message ?? "Could not check delivery for this pincode");
        setQuote(json.data as ShippingQuote);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setQuote(null);
        setQuoteError((err as Error).message);
      } finally {
        setQuoteLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [addr.pincode, mode, cartFingerprint]);

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = k === "pincode"
      ? e.target.value.replace(/\D/g, "").slice(0, 6)
      : k === "phone"
        ? e.target.value.replace(/\D/g, "").slice(0, 10)
        : e.target.value;
    setAddr({ ...addr, [k]: value });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { address: addr, paymentMode: mode, email: email || undefined };
      if (mode === "RAZORPAY" && pendingPayment) {
        const confirmed = (await api<{ orderNo: string }>("/api/v1/checkout", {
          method: "POST",
          json: { ...body, payment: pendingPayment },
        })).data;
        setPendingPayment(null);
        return finish(confirmed.orderNo);
      }
      const first = (await api<{ step: string; orderNo?: string; gateway?: { gatewayOrderId: string; amount: number; keyId: string } }>("/api/v1/checkout", { method: "POST", json: body })).data;
      if (first.step === "done") return finish(first.orderNo!);
      const gw = first.gateway!;
      // [CHG-07] CHANGED in submit(). WHY: the server now saves the order BEFORE payment, so if the Razorpay window is
      // closed we tell the server to cancel that unpaid order (abandonOrderId) instead of leaving it Pending.
      let payment: { orderId: string; paymentId: string; signature: string };
      try {
        payment = await openRazorpay(gw, addr, email, onlineChoice);
      } catch (err) {
        void api("/api/v1/checkout", { method: "POST", json: { ...body, abandonOrderId: gw.gatewayOrderId } }).catch(() => {});
        throw err;
      }
      setPendingPayment(payment);
      const second = (await api<{ step: string; orderNo: string }>("/api/v1/checkout", { method: "POST", json: { ...body, payment } })).data;
      setPendingPayment(null);
      finish(second.orderNo);
    } catch (err) {
      // [CHG-07] clearer message when the customer closes the payment window.
      setError(err instanceof ApiError ? err.message : err instanceof Error && err.message === "Payment cancelled" ? "Payment cancelled. You have not been charged." : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }
  function finish(orderNo: string) {
    refresh();
    router.push(`/checkout/success/${orderNo}`);
  }

  if (!cart) return <p className="mt-8 text-sm text-muted">Loading…</p>;
  if (!cart.lines.length) return <p className="mt-8 text-sm text-muted">Your bag is empty. <Link href="/collections/sarees" className="text-maroon underline">Shop sarees</Link></p>;
  const t = cart.totals;
  const displayShipping = quote ? quote.shippingCharge : t.shippingCharge;
  const displayTotal = quote ? Math.round((t.subTotal - t.couponDiscount + displayShipping) * 100) / 100 : t.netAmount;
  const blockedByQuote = !!quote && (!quote.serviceable || (mode === "COD" && !quote.codAvailable));

  return (
    <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
      <div className="space-y-8">
        {!customer && (
          <p className="rounded-sm border border-line bg-white/60 p-3 text-xs text-muted">
            Checking out as guest. <Link href="/login?next=/checkout" className="text-maroon underline">Log in</Link> or <Link href="/register?next=/checkout" className="text-maroon underline">create an account</Link> to use saved addresses and track orders.
          </p>
        )}
        {customer && customer.addresses.length > 0 && (
          <section>
            <h2 className="mb-3 text-2xl">Saved addresses</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {customer.addresses.map((a, i) => (
                <button type="button" key={i} onClick={() => setAddr(a)} className={`rounded-sm border p-3 text-left text-xs ${a.line1 === addr.line1 && a.pincode === addr.pincode ? "border-gold bg-gold/5" : "border-line"}`}>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.pincode}</p>
                </button>
              ))}
            </div>
          </section>
        )}
        <section>
          <h2 className="mb-4 text-2xl">Delivery address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><Input required value={addr.name ?? ""} onChange={set("name")} /></Field>
            <Field label="Mobile"><Input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={addr.phone ?? ""} onChange={set("phone")} /></Field>
            <div className="sm:col-span-2"><Field label="Email (for order updates)"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
            <div className="sm:col-span-2"><Field label="Address line 1"><Input required value={addr.line1} onChange={set("line1")} /></Field></div>
            <div className="sm:col-span-2"><Field label="Address line 2"><Input value={addr.line2 ?? ""} onChange={set("line2")} /></Field></div>
            <Field label="City"><Input required value={addr.city} onChange={set("city")} /></Field>
            <Field label="State"><Select value={addr.state} onChange={set("state")}>{STATES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Pincode"><Input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} title="Enter a valid 6-digit Indian PIN code" value={addr.pincode} onChange={set("pincode")} /></Field>
          </div>
        </section>
        <section>
          <h2 className="mb-4 text-2xl">Payment</h2>
          <div className="grid gap-2" role="radiogroup" aria-label="Choose a payment method">
            <PayOption
              selected={mode === "RAZORPAY"}
              disabled={!razorpayEnabled}
              onChange={() => setMode("RAZORPAY")}
              title="Pay online"
              text={razorpayEnabled
                ? razorpayConfigured
                  ? "UPI, cards and netbanking · Secure checkout by Razorpay"
                  : "UPI, cards and netbanking · Payment setup required before checkout"
                : !razorpayConfigured
                  ? "Currently unavailable · Online payments need to be configured by the store"
                  : "Online payments are not enabled by the store"}
            />
            {mode === "RAZORPAY" && (
              <OnlinePaymentMethods configured={razorpayConfigured} choice={onlineChoice} onSelect={setOnlineChoice} />
            )}
            <PayOption selected={mode === "COD"} disabled={!codEnabled || !!pendingPayment} onChange={() => setMode("COD")} title="Cash on delivery" text="Pay when your saree arrives" />
          </div>
          {pendingPayment && <p role="status" className="mt-2 text-xs text-olive">Payment received. If order confirmation did not finish, submit again to confirm it. Do not pay again.</p>}
          {!codEnabled && !razorpayEnabled && <p role="alert" className="mt-2 text-xs text-red-700">No payment methods are currently available. Please contact the store.</p>}
        </section>
      </div>

      <aside className="h-fit rounded-sm border border-line bg-white/60 p-6">
        <h2 className="text-2xl">Your order</h2>
        <ul className="mt-4 divide-y divide-line">
          {cart.lines.map((l) => (
            <li key={l.sku} className="flex items-center gap-3 py-3 text-sm">
              <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-line">{l.product.images[0] && <Image src={l.product.images[0]} alt="" fill unoptimized={isRemoteImageSource(l.product.images[0])} sizes="48px" className="object-cover" />}</span>
              <span className="min-w-0 flex-1"><span className="line-clamp-2">{l.product.name}</span><span className="text-xs text-muted">× {l.qty}</span></span>
              <span>{formatMoney(l.product.pricing.sellingPrice * l.qty, currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(t.subTotal, currency)}</dd></div>
          {t.couponDiscount > 0 && <div className="flex justify-between text-olive"><dt>Coupon {cart.couponCode}</dt><dd>− {formatMoney(t.couponDiscount, currency)}</dd></div>}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{quoteLoading ? "Checking…" : displayShipping > 0 ? formatMoney(displayShipping, currency) : "Free"}</dd>
          </div>
          {quote && (
            <div className="rounded-sm bg-ivory/70 px-3 py-2 text-[11px] leading-relaxed text-muted">
              {!quote.serviceable ? (
                <span className="font-semibold text-red-700">Delivery is unavailable to {addr.pincode}. Try another address.</span>
              ) : (
                <>
                  <span className="block font-semibold text-ink">
                    {quote.selectedCourier?.name ?? (quote.provider === "shiprocket" ? "Courier" : "Standard delivery")}
                    {quote.etaDays ? ` · ${quote.etaDays} day${quote.etaDays === 1 ? "" : "s"}` : quote.estimatedDelivery ? ` · ${quote.estimatedDelivery}` : ""}
                  </span>
                  <span className="block">
                    {mode === "COD" ? (quote.codAvailable ? "Cash on delivery available" : "Cash on delivery is not available here") : "Prepaid order"}
                    {quote.freeShippingApplied ? " · Free shipping applied" : ""}
                  </span>
                  {quote.fallback && <span className="block">Live courier rates are unavailable, so our standard rate applies.</span>}
                  {quote.couriers.length > 1 && <span className="block">Computed from {quote.couriers.length} available courier services.</span>}
                </>
              )}
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total</dt><dd>{formatMoney(displayTotal, currency)}</dd></div>
        </dl>
        {quoteError && <p role="alert" className="mt-3 text-xs text-amber-700">{quoteError} You can still place the order; our team will confirm shipping.</p>}
        {error && <p className="mt-4 rounded-sm bg-red-50 p-2 text-xs text-red-800">{error}</p>}
        <Button type="submit" size="lg" className="mt-6 w-full" loading={busy} disabled={(!codEnabled && !razorpayEnabled) || blockedByQuote}>
          {pendingPayment ? "Confirm paid order" : mode === "COD" ? "Place order" : `Pay ${formatMoney(t.netAmount, "INR")}`}
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted">Orders are billed in INR. By placing an order you agree to our policies.</p>
      </aside>
    </form>
  );
}

const ONLINE_PAYMENT_METHODS = [
  { option: "upi_apps", method: "upi", label: "UPI apps", detail: "Choose from the UPI apps available in secure Razorpay checkout" },
  { option: "wallet", method: "wallet", label: "Wallets", detail: "Choose from wallets enabled for the store" },
  { option: "card", method: "card", label: "Debit / Credit cards", detail: "Visa, Mastercard, RuPay and other supported cards" },
  { option: "netbanking", method: "netbanking", label: "Net banking", detail: "Choose your bank below" },
] as const;

const BANKS = [
  { name: "State Bank of India", code: "SBIN" },
  { name: "HDFC Bank", code: "HDFC" },
  { name: "ICICI Bank", code: "ICIC" },
  { name: "Axis Bank", code: "UTIB" },
  { name: "Bank of Baroda", code: "BARB" },
  { name: "Canara Bank", code: "CNRB" },
  { name: "Central Bank of India", code: "CBIN" },
  { name: "Federal Bank", code: "FDRL" },
  { name: "IDBI Bank", code: "IBKL" },
  { name: "Indian Bank", code: "IDIB" },
  { name: "Indian Overseas Bank", code: "IOBA" },
  { name: "IndusInd Bank", code: "INDB" },
  { name: "Kotak Mahindra Bank", code: "KKBK" },
  { name: "Punjab National Bank", code: "PUNB" },
  { name: "RBL Bank", code: "RATN" },
  { name: "Union Bank of India", code: "UBIN" },
  { name: "Yes Bank", code: "YESB" },
];

type OnlineOption = "upi_apps" | "wallet" | "card" | "netbanking";
type UpiAppChoice = "gpay" | "phonepe" | "paytm" | "razorpay";
type OnlinePaymentChoice = { option: OnlineOption; bank?: string; upiApp?: UpiAppChoice };

function OnlinePaymentMethods({
  configured,
  choice,
  onSelect,
}: {
  configured: boolean;
  choice: OnlinePaymentChoice;
  onSelect: (choice: OnlinePaymentChoice) => void;
}) {
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [expanded, setExpanded] = useState<OnlineOption | null>("upi_apps");
  const visibleBanks = showAllBanks ? BANKS : BANKS.slice(0, 4);

  return (
    <div className="overflow-hidden rounded-sm border border-gold/70 bg-white/70">
      <p className="border-b border-line bg-ivory px-4 py-3 text-xs text-muted">
        {configured
          ? "Choose how you would like to pay online"
          : "Choose an option now; payment will be available after the store configures Razorpay"}
      </p>
      <ul className="divide-y divide-line">
        {ONLINE_PAYMENT_METHODS.map((method) => {
          const isExpanded = expanded === method.option;
          const isSelected = choice.option === method.option;
          return (
            <li key={method.option}>
              <div className="flex items-center gap-2 px-4 py-3 transition-colors hover:bg-ivory/70">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    onSelect({ option: method.option });
                    setExpanded(isExpanded ? null : method.option);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm"
                >
                  <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${isSelected ? "bg-olive text-white" : "bg-olive/10 text-olive"}`}>
                    {method.method === "card" ? "CARD" : method.method === "netbanking" ? "BANK" : method.method === "wallet" ? "WAL" : "UPI"}
                  </span>
                  <span>
                    <span className="block">{method.label}</span>
                    {method.option === "upi_apps" && <span className="block text-xs text-muted">Google Pay, PhonePe, Paytm and more</span>}
                  </span>
                  <span aria-hidden="true" className={`ml-auto h-5 w-5 shrink-0 rounded-full border ${isSelected ? "border-[6px] border-olive" : "border-2 border-muted"}`} />
                </button>
                {method.method === "netbanking" && (
                  <button
                    type="button"
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} bank list`}
                    aria-expanded={isExpanded}
                    onClick={() => {
                      if (!isSelected) onSelect({ option: "netbanking" });
                      setExpanded(isExpanded ? null : method.option);
                    }}
                    className="rounded-sm p-1 text-muted hover:bg-white"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
              {isExpanded && method.option !== "netbanking" && (
                <div className="bg-ivory/50 py-3 pl-[60px] pr-4 text-xs text-muted">
                  <div className="flex flex-col gap-2">
                    <span>{method.detail}</span>
                    {method.option === "upi_apps" && (
                      <div className="flex flex-wrap items-center gap-2" aria-label="Choose a UPI checkout preference">
                        <button
                          type="button"
                          aria-pressed={isSelected && choice.upiApp === "gpay"}
                          onClick={() => onSelect({ option: "upi_apps", upiApp: "gpay" })}
                          className={`inline-flex items-center gap-1.5 rounded-sm border bg-white px-2 py-1 text-[11px] font-medium text-ink ${isSelected && choice.upiApp === "gpay" ? "border-olive ring-1 ring-olive" : "border-line hover:border-olive"}`}
                        >
                          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5" fill="none">
                            <path d="M14.2 5.8 26 12.6c3.8 2.2 5.1 7.1 2.9 10.9L17.4 43l-7.2-4.1C4.7 36 2.6 30.4 4 24.3l3-13.1c.8-3.6 4.1-6.1 7.2-5.4Z" fill="#4285F4" />
                            <path d="m25.1 4.6 8.3 4.8c7.5 4.3 10.1 14 5.8 21.5l-4.2 7.3-8-4.6c-3.9-2.2-5.2-7.2-2.9-11.1l2.8-4.8c1.3-2.3.5-5.2-1.8-6.5l-7.2-4.1c2.1-2.9 4.5-3.9 7.2-2.5Z" fill="#34A853" />
                            <path d="m35.7 8.9 4.2 2.4c6.9 4 9.3 12.8 5.3 19.7l-4.5 7.8c-2 3.5-6.5 4.7-10 2.7l-6.4-3.7 8.4-14.5c2.3-4 2.1-8.9-.5-12.6l3.5-1.8Z" fill="#EA4335" />
                            <path d="m12.4 30.7 4.9-8.5 6.5 3.7c3.9 2.3 8.9 1 11.2-2.9l.7-1.2c2.3 3.6 2.5 8.3.3 12.1l-5.2 9c-4.1 7.1-13.2 9.5-20.3 5.4l-.1-.1c-7.1-4.1-9.5-13.2-5.4-20.3l.4-.7c.5 1.5 1.5 2.7 3 3.5l4 2.3Z" fill="#FBBC04" />
                          </svg>
                          GPay
                        </button>
                        <button
                          type="button"
                          aria-pressed={isSelected && choice.upiApp === "phonepe"}
                          onClick={() => onSelect({ option: "upi_apps", upiApp: "phonepe" })}
                          className={`inline-flex items-center gap-1.5 rounded-sm border bg-white px-2 py-1 text-[11px] font-medium text-ink ${isSelected && choice.upiApp === "phonepe" ? "border-olive ring-1 ring-olive" : "border-line hover:border-olive"}`}
                        >
                          <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-[#5f259f] text-[10px] font-bold text-white">P</span>
                          PhonePe
                        </button>
                        <button
                          type="button"
                          aria-pressed={isSelected && choice.upiApp === "paytm"}
                          onClick={() => onSelect({ option: "upi_apps", upiApp: "paytm" })}
                          className={`inline-flex items-center gap-1.5 rounded-sm border bg-white px-2 py-1 text-[11px] font-semibold text-[#002970] ${isSelected && choice.upiApp === "paytm" ? "border-olive ring-1 ring-olive" : "border-line hover:border-olive"}`}
                        >
                          <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-[#00baf2] text-[8px] font-bold text-white">P</span>
                          Paytm
                        </button>
                        <button
                          type="button"
                          aria-pressed={isSelected && choice.upiApp === "razorpay"}
                          onClick={() => onSelect({ option: "upi_apps", upiApp: "razorpay" })}
                          className={`inline-flex items-center gap-1.5 rounded-sm border bg-white px-2 py-1 text-[11px] font-medium text-ink ${isSelected && choice.upiApp === "razorpay" ? "border-olive ring-1 ring-olive" : "border-line hover:border-olive"}`}
                        >
                          <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-sm bg-[#2b84ea] text-[8px] font-bold text-white">R</span>
                          Razorpay
                        </button>
                      </div>
                    )}
                    {method.option === "upi_apps" && (
                      <span className="text-[11px]">Select an option, then press Pay. GPay and Paytm use Razorpay UPI; PhonePe uses its wallet option when enabled; Razorpay opens UPI checkout.</span>
                    )}
                  </div>
                </div>
              )}
              {isExpanded && method.option === "netbanking" && (
                <div className="border-t border-line bg-white/70">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected && !choice.bank}
                    onClick={() => onSelect({ option: "netbanking" })}
                    className="flex w-full items-center justify-between border-b border-line/70 px-4 py-3 pl-[60px] text-left text-sm hover:bg-ivory/70"
                  >
                    <span>Other banks (choose in Razorpay)</span>
                    <span aria-hidden="true" className={`h-5 w-5 rounded-full border ${isSelected && !choice.bank ? "border-[6px] border-olive" : "border-2 border-muted"}`} />
                  </button>
                  {visibleBanks.map((bank) => {
                    const bankSelected = isSelected && choice.bank === bank.code;
                    return (
                      <button
                        type="button"
                        key={bank.code}
                        role="radio"
                        aria-checked={bankSelected}
                        onClick={() => onSelect({ option: "netbanking", bank: bank.code })}
                        className="flex w-full items-center justify-between border-b border-line/70 px-4 py-3 pl-[60px] text-left text-sm hover:bg-ivory/70"
                      >
                        <span className="flex items-center gap-3">
                          <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-sky-100 text-[9px] font-semibold text-sky-800">{bank.code.slice(0, 2)}</span>
                          {bank.name}
                        </span>
                        <span aria-hidden="true" className={`h-5 w-5 rounded-full border ${bankSelected ? "border-[6px] border-olive" : "border-2 border-muted"}`} />
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setShowAllBanks((value) => !value)}
                    className="px-4 py-3 pl-[60px] text-xs font-semibold uppercase tracking-wide text-maroon hover:underline"
                  >
                    {showAllBanks ? "Show fewer banks" : "View all banks"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PayOption({ selected, disabled = false, onChange, title, text }: { selected: boolean; disabled?: boolean; onChange: () => void; title: string; text: string }) {
  return (
    <label className={`flex items-center gap-3 rounded-sm border p-4 text-left ${selected ? "border-gold bg-gold/5" : "border-line"} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <input type="radio" name="paymentMode" checked={selected} disabled={disabled} onChange={onChange} className="h-4 w-4 accent-olive disabled:opacity-60" />
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="text-xs text-muted">{text}</span>
      </span>
    </label>
  );
}

declare global { interface Window { Razorpay?: new (o: unknown) => { open: () => void } } }

/** Loads checkout.js and resolves with the payment triple. */
function openRazorpay(
  gw: { gatewayOrderId: string; amount: number; keyId: string },
  addr: Address,
  email: string,
  choice: OnlinePaymentChoice,
) {
  return new Promise<{ orderId: string; paymentId: string; signature: string }>((resolve, reject) => {
    const run = () => {
      if (!window.Razorpay) return reject(new Error("Razorpay failed to load"));
      const selectedMethod = ONLINE_PAYMENT_METHODS.find((method) => method.option === choice.option);
      if (!selectedMethod) return reject(new Error("Choose a valid online payment method."));
      const instrument = choice.upiApp === "phonepe"
        ? { method: "wallet", wallets: ["phonepe"] }
        : selectedMethod.method === "netbanking" && choice.bank
          ? { method: "netbanking", banks: [choice.bank] }
          : { method: selectedMethod.method };
      const rzp = new window.Razorpay({
        key: gw.keyId,
        amount: gw.amount,
        currency: "INR",
        order_id: gw.gatewayOrderId,
        name: "Woven Essence",
        // [CHG-08] NEW: brand the Razorpay window (logo + description).
        description: "Secure payment · Temple Fabrics",
        image: `${window.location.origin}/logo1.png`,
        prefill: { name: addr.name, contact: addr.phone, email },
        config: {
          display: {
            blocks: {
              selected: {
                name: choice.bank
                  ? `Pay using ${BANKS.find((bank) => bank.code === choice.bank)?.name ?? "selected bank"}`
                  : selectedMethod.label,
                instruments: [instrument],
              },
            },
            sequence: ["block.selected"],
            // [CHG-08] CHANGED false -> true. WHY: also show the other enabled methods (cards, netbanking) so checkout never dead-ends.
            preferences: { show_default_blocks: true },
          },
        },
        // [CHG-08] backdrop_color added so the Razorpay overlay matches the Woven Essence maroon.
        theme: { color: "#7A1F2B", backdrop_color: "#2A0A10" },
        handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => resolve({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      });
      rzp.open();
    };
    if (window.Razorpay) return run();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = run;
    s.onerror = () => reject(new Error("Razorpay failed to load"));
    document.body.appendChild(s);
  });
}

