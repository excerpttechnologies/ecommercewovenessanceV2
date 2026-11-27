
"use client";

import { useEffect, useState } from "react";
import { api } from "@/hooks/api";
import { formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = {
  sku: string;
  slug: string;
  name: string;
  images?: string[];
  pricing: {
    sellingPrice: number;
  };
};

type Config = {
  enabled: boolean;
  title: string;
  description: string;
  skus: string[];
};

type SelectedProduct = {
  sku: string;
  product?: Product;
};

type AllGroup = {
  key: string;
  enabled: boolean;
  title: string;
  description: string;
  skus: string[];
  products: {
    sku: string;
    product: Product | null;
  }[];
};

type ResponseData = {
  config: Config;
  products: Product[];
  selectedProducts: Product[];
  groupCounts?: Record<string, number>;
  allGroups?: AllGroup[];
};

const INSTAGRAM_GROUPS = [
  { value: "default", label: "Main Instagram Shop" },
  { value: "sarees", label: "Sarees" },
  { value: "fabrics", label: "Fabrics" },
  { value: "plain-fabrics", label: "Plain Fabrics" },
  { value: "dupatta", label: "Dupatta" },
  { value: "pavada", label: "Pavada" },
  { value: "dhotis", label: "Dhotis" },
  { value: "best-buy", label: "Best Buy" },
  { value: "new-arrivals", label: "New Arrivals" },
];

const DEFAULT_CONFIG: Config = {
  enabled: true,
  title: "Shop our Instagram edit",
  description: "",
  skus: [],
};

function getGroupLabel(key: string) {
  return (
    INSTAGRAM_GROUPS.find((item) => item.value === key)?.label ?? key
  );
}

export default function InstagramAdminPage() {
  const [group, setGroup] = useState("default");
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [selected, setSelected] = useState<SelectedProduct[]>([]);
  const [allGroups, setAllGroups] = useState<AllGroup[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load the selected group and all permanently saved Instagram products.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setSearch("");
      setResults([]);
      setSelected([]);
      setConfig(DEFAULT_CONFIG);

      try {
        const response = await api<ResponseData>(
          `/api/v1/admin/instagram?group=${encodeURIComponent(group)}`,
        );

        if (cancelled) return;

        const data = response.data;

        setConfig(data.config);
        setAllGroups(data.allGroups ?? []);

        const productsBySku = new Map(
          (data.selectedProducts ?? []).map((product) => [
            product.sku.toUpperCase(),
            product,
          ]),
        );

        setSelected(
          (data.config.skus ?? []).map((sku) => ({
            sku,
            product: productsBySku.get(sku.toUpperCase()),
          })),
        );
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load Instagram settings.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [group]);

  // Search products.
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (search.trim().length < 2) {
        setResults([]);
        return;
      }

      try {
        const response = await api<ResponseData>(
          `/api/v1/admin/instagram?group=${encodeURIComponent(
            group,
          )}&q=${encodeURIComponent(search.trim())}`,
        );

        if (!cancelled) {
          setResults(response.data.products ?? []);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, group]);

  // Refresh all groups from MongoDB.
  async function refreshAllGroups() {
    const response = await api<ResponseData>(
      `/api/v1/admin/instagram?group=${encodeURIComponent(group)}`,
    );

    setAllGroups(response.data.allGroups ?? []);
  }

  function addProduct(product: Product) {
    setSelected((current) =>
      current.some(
        (item) =>
          item.sku.toUpperCase() === product.sku.toUpperCase(),
      )
        ? current
        : [...current, { sku: product.sku, product }],
    );
  }

  // Remove from the current unsaved selection.
  function removeProduct(sku: string) {
    setSelected((current) =>
      current.filter(
        (item) => item.sku.toUpperCase() !== sku.toUpperCase(),
      ),
    );
  }

  function moveProduct(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const next = [...current];
      const target = index + direction;

      if (target < 0 || target >= next.length) {
        return current;
      }

      [next[index], next[target]] = [
        next[target],
        next[index],
      ];

      return next;
    });
  }

  // Save additions, removals and ordering for the selected group.
  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const skus = selected.map((item) => item.sku);

      await api("/api/v1/admin/instagram", {
        method: "POST",
        json: {
          key: group,
          enabled: config.enabled,
          title: config.title,
          description: config.description,
          skus,
        },
      });

      setConfig((current) => ({
        ...current,
        skus,
      }));

      await refreshAllGroups();

      setMessage(
        `${getGroupLabel(group)} Instagram products saved successfully.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save Instagram products.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Permanently remove a saved product from its Instagram group.
  // This does not delete the product from the ecommerce catalogue.
  async function removeSavedProduct(
    groupKey: string,
    sku: string,
  ) {
    const targetGroup = allGroups.find(
      (item) => item.key === groupKey,
    );

    if (!targetGroup) return;

    const updatedSkus = targetGroup.skus.filter(
      (item) => item.toUpperCase() !== sku.toUpperCase(),
    );

    setSaving(true);
    setMessage("");

    try {
      await api("/api/v1/admin/instagram", {
        method: "PUT",
        json: {
          key: targetGroup.key,
          enabled: targetGroup.enabled,
          title: targetGroup.title,
          description: targetGroup.description,
          skus: updatedSkus,
        },
      });

      setAllGroups((current) =>
        current
          .map((item) =>
            item.key === groupKey
              ? {
                  ...item,
                  skus: updatedSkus,
                  products: item.products.filter(
                    (entry) =>
                      entry.sku.toUpperCase() !== sku.toUpperCase(),
                  ),
                }
              : item,
          )
          .filter((item) => item.skus.length > 0),
      );

      if (group === groupKey) {
        setSelected((current) =>
          current.filter(
            (item) =>
              item.sku.toUpperCase() !== sku.toUpperCase(),
          ),
        );

        setConfig((current) => ({
          ...current,
          skus: updatedSkus,
        }));
      }

      setMessage(
        `${sku} removed permanently from ${getGroupLabel(groupKey)} Instagram products.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not remove Instagram product.",
      );
    } finally {
      setSaving(false);
    }
  }

  const totalSavedProducts = allGroups.reduce(
    (total, item) => total + item.skus.length,
    0,
  );

  if (loading) {
    return (
      <div className="p-8 text-sm text-muted">
        Loading Instagram Shop...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Instagram Shop
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage permanently saved Instagram products across all groups.
          </p>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {message && (
        <p className="rounded-lg border p-3 text-sm">
          {message}
        </p>
      )}

      {/* All permanently saved products */}
      <section className="space-y-4 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">
              All Added Instagram Products
            </h2>
            <p className="mt-1 text-sm text-muted">
              Products saved by the admin across every Instagram group.
            </p>
          </div>

          <span className="text-sm font-medium text-muted">
            {totalSavedProducts} products
          </span>
        </div>

        {allGroups.length === 0 ? (
          <p className="text-sm text-muted">
            No Instagram products have been saved yet.
          </p>
        ) : (
          <div className="space-y-6">
            {allGroups.map((item) => (
              <div key={item.key} className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-semibold">
                    {getGroupLabel(item.key)}
                  </h3>

                  <span className="text-xs text-muted">
                    {item.skus.length} products
                  </span>
                </div>

                {item.products.map(({ sku, product }) => (
                  <div
                    key={`${item.key}-${sku}`}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                  >
                    {product?.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-14 w-14 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-md bg-muted" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {product?.name ?? "Product details unavailable"}
                      </p>

                      <p className="text-xs text-muted">
                        SKU: {sku}
                      </p>

                      {product && (
                        <p className="text-sm">
                          {formatINR(product.pricing.sellingPrice)}
                        </p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() =>
                        removeSavedProduct(item.key, sku)
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Group selector */}
      <section className="max-w-md space-y-2 rounded-xl border p-5">
        <label className="text-sm font-semibold">
          Select Product Group
        </label>

        <select
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/15"
          disabled={saving}
        >
          {INSTAGRAM_GROUPS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <p className="text-xs text-muted">
          Each group has its own products, title, description and enabled setting.
        </p>
      </section>

      {/* Group settings */}
      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="font-semibold">Group Settings</h2>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
          />
          Enable this Instagram product group
        </label>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Section title
          </label>

          <Input
            value={config.title}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Shop our Instagram edit"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Section description
          </label>

          <textarea
            className="min-h-24 w-full rounded-lg border bg-transparent p-3 text-sm"
            value={config.description}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Discover our curated products."
          />
        </div>
      </section>

      {/* Product search */}
      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="font-semibold">Add Products</h2>

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products by name or SKU..."
        />

        {search.trim().length >= 2 && (
          <div className="space-y-2">
            {results.map((product) => {
              const alreadyAdded = selected.some(
                (item) =>
                  item.sku.toUpperCase() ===
                  product.sku.toUpperCase(),
              );

              return (
                <div
                  key={product.sku}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-14 w-14 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-md bg-muted" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>

                    <p className="text-xs text-muted">
                      SKU: {product.sku}
                    </p>

                    <p className="text-sm">
                      {formatINR(product.pricing.sellingPrice)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    disabled={alreadyAdded || saving}
                    onClick={() => addProduct(product)}
                  >
                    {alreadyAdded ? "Added" : "Add"}
                  </Button>
                </div>
              );
            })}

            {results.length === 0 && (
              <p className="text-sm text-muted">
                No matching products found.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Selected products for current group */}
      <section className="space-y-4 rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            Selected Products — {getGroupLabel(group)}
          </h2>

          <span className="text-sm text-muted">
            {selected.length} products
          </span>
        </div>

        {selected.length === 0 ? (
          <p className="text-sm text-muted">
            No products selected in this group. Search above to add products.
          </p>
        ) : (
          <div className="space-y-2">
            {selected.map((item, index) => (
              <div
                key={`${item.sku}-${index}`}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span className="w-6 text-sm text-muted">
                  {index + 1}.
                </span>

                {item.product?.images?.[0] ? (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-md bg-muted" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.product?.name ?? "Product details unavailable"}
                  </p>

                  <p className="text-xs text-muted">
                    SKU: {item.sku}
                  </p>

                  {item.product && (
                    <p className="text-sm">
                      {formatINR(item.product.pricing.sellingPrice)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={index === 0 || saving}
                    onClick={() => moveProduct(index, -1)}
                  >
                    ↑
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={index === selected.length - 1 || saving}
                    onClick={() => moveProduct(index, 1)}
                  >
                    ↓
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => removeProduct(item.sku)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </section>
    </div>
  );
}
