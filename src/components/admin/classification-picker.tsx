"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ClassificationPicker({
  label,
  value,
  options,
  onChange,
  onAddCustom,
  onDeleteOption,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onAddCustom: (value: string) => Promise<void>;
  onDeleteOption: (value: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [deletingOption, setDeletingOption] = useState<string | null>(null);
  const selected = useMemo(
    () => value.split(",").map((item) => item.trim()).filter(Boolean),
    [value],
  );
  const matches = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return options.filter((option) =>
      (!search || option.toLocaleLowerCase().includes(search)),
    );
  }, [options, query]);
  const customValue = query.trim();
  const canAddCustom = !!customValue
    && !options.some((option) => option.toLocaleLowerCase() === customValue.toLocaleLowerCase())
    && !selected.some((item) => item.toLocaleLowerCase() === customValue.toLocaleLowerCase());

  const add = (option: string) => {
    if (!selected.some((item) => item.toLocaleLowerCase() === option.toLocaleLowerCase())) {
      onChange([...selected, option].join(", "));
    }
    setQuery("");
  };

  const addCustom = async () => {
    if (!canAddCustom) return;
    setAddingCustom(true);
    setAddError(null);
    try {
      await onAddCustom(customValue);
      add(customValue);
    } catch (error) {
      setAddError((error as Error).message);
    } finally {
      setAddingCustom(false);
    }
  };

  const deleteOption = async (option: string) => {
    setDeletingOption(option);
    setDeleteError(null);
    try {
      await onDeleteOption(option);
      remove(option);
    } catch (error) {
      setDeleteError((error as Error).message);
    } finally {
      setDeletingOption(null);
    }
  };

  const remove = (option: string) => {
    onChange(selected.filter((item) => item !== option).join(", "));
  };

  return (
    <div
      className="space-y-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setShowOptions(false);
      }}
    >
      <div className="flex min-h-10 flex-wrap items-center rounded-sm border border-line bg-white focus-within:border-gold focus-within:ring-1 focus-within:ring-gold">
        {!!selected.length && (
          <div className="flex flex-wrap items-center gap-x-1 px-3 py-1 text-sm" aria-label={`Selected ${label}`}>
            {selected.map((option, index) => (
              <span key={option} className="inline-flex items-center">
                <span>{option}</span>
                <button type="button" aria-label={`Remove ${option}`} className="ml-1 font-medium text-muted hover:text-maroon" onClick={() => remove(option)}>×</button>
                {index < selected.length - 1 && <span>,</span>}
              </span>
            ))}
          </div>
        )}
        <Input
          aria-label={`Search ${label}`}
          autoComplete="off"
          placeholder={`Type to search ${label.toLowerCase()}…`}
          value={query}
          className="h-10 min-w-[10rem] w-auto flex-1 border-0 bg-transparent px-3 focus:border-0 focus:ring-0"
          onFocus={() => setShowOptions(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && matches[0]) {
              event.preventDefault();
              add(matches[0]);
            } else if (event.key === "Enter" && canAddCustom) {
              event.preventDefault();
              addCustom();
            }
            if (event.key === "Escape") {
              setQuery("");
              setShowOptions(false);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      {showOptions && (
        <div className="max-h-40 overflow-y-auto rounded-sm border border-line bg-white shadow-sm" role="group" aria-label={`${label} options`}>
          {matches.length
            ? matches.map((option) => (
              <div key={option} className="flex items-center border-b border-line last:border-b-0">
                <button
                  type="button"
                  className="min-w-0 flex-1 px-3 py-2 text-left text-sm hover:bg-ivory focus:bg-ivory focus:outline-none"
                  onClick={() => add(option)}
                >
                  {option}
                  {selected.some((item) => item.toLocaleLowerCase() === option.toLocaleLowerCase()) && (
                    <span className="ml-2 text-xs text-muted">Selected</span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${option} from ${label} options`}
                  title={`Delete ${option}`}
                  disabled={deletingOption === option}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-muted hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold disabled:opacity-50"
                  onClick={() => void deleteOption(option)}
                >
                  {deletingOption === option
                    ? <span aria-hidden="true" className="text-sm">…</span>
                    : <Trash2 aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
            ))
            : null}
          {canAddCustom && (
            <button
              type="button"
              role="option"
              aria-selected="false"
              disabled={addingCustom}
              className="block w-full border-t border-line px-3 py-2 text-left text-sm text-ink hover:bg-ivory focus:bg-ivory focus:outline-none disabled:opacity-50"
              onClick={addCustom}
            >
              {addingCustom ? "Adding…" : <>Add &quot;{customValue}&quot;</>}
            </button>
          )}
          {!matches.length && !canAddCustom && <p className="px-3 py-2 text-sm text-muted">No matching options.</p>}
        </div>
      )}
      {addError && <p role="alert" className="text-xs text-red-700">{addError}</p>}
      {deleteError && <p role="alert" className="text-xs text-red-700">{deleteError}</p>}
    </div>
  );
}
