export interface ProductOverviewRow {
  label: string;
  value: string;
}

/** Dynamic product specifications. Empty values are filtered out by the caller. */
export function ProductOverviewTab({
  rows,
  description,
  productName,
}: {
  rows: ProductOverviewRow[];
  description?: string | null;
  productName: string;
}) {
  return (
    <div>
      {description && <p className="mb-5 max-w-3xl text-ink/80">{description}</p>}
      {rows.length ? (
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="border-b border-line/70 pb-2">
              <dt className="text-[11px] uppercase tracking-wider text-muted">{row.label}</dt>
              <dd className="mt-0.5 text-[15px] text-olive">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-muted">
          Specifications for {productName} are being completed. Please contact our team if you need a specific
          measurement or detail.
        </p>
      )}
    </div>
  );
}
