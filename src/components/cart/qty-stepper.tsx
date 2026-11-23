"use client";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { isDecimalUnit } from "@/lib/product-quantity";

type QtyStepperProps = {
  value: number;
  max?: number;
  min?: number;
  step?: number;
  onChange: (v: number) => void | Promise<unknown>;
  size?: "sm" | "md" | "product";
  unit?: string;
  unitType?: string;
  ariaLabel?: string;
  onDraftChange?: (v: number) => void;
  showUnit?: boolean;
};

export function QtyStepper({
  value,
  max = 20,
  min,
  step: customStep,
  onChange,
  size = "sm",
  unit,
  unitType,
  ariaLabel = "Quantity",
  onDraftChange,
  showUnit = false,
}: QtyStepperProps) {
  const decimal = isDecimalUnit(unit, unitType);
  const stepSize = customStep ?? (decimal ? 0.5 : 1);
  const effectiveMin = min !== undefined ? min : (decimal ? 0.5 : 1);
  const height = size === "sm" ? "h-8" : size === "md" ? "h-11" : "h-12";
  const buttonWidth = size === "product" ? "w-11" : "w-8";
  const iconSize = size === "product" ? "h-4 w-4" : "h-3.5 w-3.5";
  const buttonColor = size === "product" ? "text-olive" : "text-muted";
  const minusHover = size === "product" ? "" : "hover:text-maroon";
  const removeIcon = size !== "product" && effectiveMin === 0 && value <= (decimal ? 0.5 : 1);
  const inputMax = decimal ? Math.floor((max + Number.EPSILON) * 100) / 100 : Math.floor(max);
  const inputMin = decimal ? Math.ceil((effectiveMin - Number.EPSILON) * 100) / 100 : Math.ceil(effectiveMin);
  const unitLabel = decimal ? "Mtr" : (unit?.trim() || unitType?.trim() || "units");
  const [inputValue, setInputValue] = useState(String(value));
  const [message, setMessage] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputValueRef = useRef(String(value));
  const lastValidRef = useRef(value);
  const lastSubmittedRef = useRef(value);
  const editingRef = useRef(false);

  const parseInput = (raw: string, fallback: number) => {
    const valid = decimal ? /^\d*\.?\d{0,2}$/.test(raw) : /^\d*$/.test(raw);
    if (!raw || !valid || raw === ".") return { quantity: fallback, exceededStock: false };
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return { quantity: fallback, exceededStock: false };
    const rounded = decimal ? Math.round((parsed + Number.EPSILON) * 100) / 100 : Math.round(parsed);
    return {
      quantity: Math.min(inputMax, Math.max(inputMin, rounded)),
      exceededStock: parsed > inputMax,
    };
  };

  useEffect(() => {
    if (editingRef.current) return;
    const next = String(value);
    inputValueRef.current = next;
    lastValidRef.current = value;
    lastSubmittedRef.current = value;
    setInputValue(next);
    setMessage("");
    onDraftChange?.(value);
  }, [value, onDraftChange]);

  const setDraft = (next: string, preview: number) => {
    inputValueRef.current = next;
    setInputValue(next);
    onDraftChange?.(preview);
  };

  const submit = (next: number) => {
    if (next === lastSubmittedRef.current) return;
    lastSubmittedRef.current = next;
    const request = onChange(next);
    if (request && typeof request.then === "function") {
      void request.catch(() => {
        lastSubmittedRef.current = value;
        lastValidRef.current = value;
        setDraft(String(value), value);
        setMessage("Could not update quantity. Please try again.");
      });
    }
  };

  const commitInput = () => {
    const { quantity, exceededStock } = parseInput(inputValueRef.current, lastValidRef.current);
    lastValidRef.current = quantity;
    setDraft(String(quantity), quantity);
    setMessage(exceededStock ? `Only ${inputMax} ${unitLabel} available` : "");
    submit(quantity);
  };

  const step = (direction: number) => {
    const current = parseInput(inputValueRef.current, lastValidRef.current).quantity;
    const rawNext = current + direction * stepSize;
    const rounded = decimal ? Math.round((rawNext + Number.EPSILON) * 100) / 100 : Math.round(rawNext);
    const next = Math.min(inputMax, Math.max(inputMin, rounded));
    lastValidRef.current = next;
    setDraft(String(next), next);
    setMessage("");
    submit(next);
  };

  return (
    <div
      ref={wrapperRef}
      onBlur={(event) => {
        if (event.relatedTarget && wrapperRef.current?.contains(event.relatedTarget as Node)) return;
        editingRef.current = false;
        commitInput();
      }}
      className="inline-flex flex-col items-center"
    >
      <div className={`inline-flex items-center ${size === "product" ? "rounded-full" : "rounded-lg"} border border-line bg-white ${height}`}>
        <button
          type="button"
          aria-label={size === "product" ? "Decrease quantity" : "Decrease"}
          disabled={(size === "product" || inputMin > 0) && value <= inputMin}
          onClick={() => step(-1)}
          className={`flex h-full ${buttonWidth} items-center justify-center ${buttonColor} ${minusHover} disabled:opacity-30`}
        >
          {removeIcon ? <Trash2 className={iconSize} /> : <Minus className={iconSize} />}
        </button>
        <div className="flex items-center justify-center px-1">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            aria-label={ariaLabel}
            value={inputValue}
            onFocus={(event) => {
              editingRef.current = true;
              event.currentTarget.select();
            }}
            onChange={(event) => {
              const next = event.currentTarget.value;
              if (decimal ? /^\d*\.?\d{0,2}$/.test(next) : /^\d*$/.test(next)) {
                const { quantity } = parseInput(next, lastValidRef.current);
                setDraft(next, quantity);
                setMessage("");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                commitInput();
              }
            }}
            className={`min-w-[1.75rem] ${decimal ? "w-11" : "w-7"} rounded-sm bg-transparent p-0 text-center outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 ${size === "product" ? "text-sm font-semibold" : "text-sm tabular-nums"}`}
          />
          {(showUnit || decimal) && (
            <span className="pr-1 text-xs font-medium text-muted select-none">
              {decimal ? "Mtr" : (unit?.trim() || "Pc")}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={size === "product" ? "Increase quantity" : "Increase"}
          disabled={value >= inputMax}
          onClick={() => step(1)}
          className={`flex h-full ${buttonWidth} items-center justify-center ${buttonColor} hover:text-olive disabled:opacity-40`}
        >
          <Plus className={iconSize} />
        </button>
      </div>
      {message && <span role="status" className="mt-1 text-[11px] text-amber-800">{message}</span>}
    </div>
  );
}
