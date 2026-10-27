"use client";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
      const payment = await openRazorpay(gw, addr, email, onlineChoice);
      setPendingPayment(payment);
      const second = (await api<{ step: string; orderNo: string }>("/api/v1/checkout", { method: "POST", json: { ...body, payment } })).data;
      setPendingPayment(null);
      finish(second.orderNo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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
          <div className="flex justify-between"><dt>Shipping</dt><dd>{t.shippingCharge ? formatMoney(t.shippingCharge, currency) : "Free"}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total</dt><dd>{formatMoney(t.netAmount, currency)}</dd></div>
        </dl>
        {error && <p className="mt-4 rounded-sm bg-red-50 p-2 text-xs text-red-800">{error}</p>}
        <Button type="submit" size="lg" className="mt-6 w-full" loading={busy} disabled={!codEnabled && !razorpayEnabled}>
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
            preferences: { show_default_blocks: false },
          },
        },
        theme: { color: "#7A1F2B" },
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
