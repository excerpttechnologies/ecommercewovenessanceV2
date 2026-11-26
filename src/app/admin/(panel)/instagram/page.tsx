
// "use client";

// import { useEffect, useState } from "react";
// import { api } from "@/hooks/api";
// import { formatINR } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";

// type Product = {
//   sku: string;
//   slug: string;
//   name: string;
//   images?: string[];
//   pricing: {
//     sellingPrice: number;
//   };
// };

// type Config = {
//   enabled: boolean;
//   title: string;
//   description: string;
//   skus: string[];
// };

// type ResponseData = {
//   config: Config;
//   products: Product[];
//   selectedProducts: Product[];
// };

// export default function InstagramAdminPage() {
//   const [config, setConfig] = useState<Config>({
//     enabled: true,
//     title: "Shop our Instagram edit",
//     description: "",
//     skus: [],
//   });
//   const [selected, setSelected] = useState<Product[]>([]);
//   const [results, setResults] = useState<Product[]>([]);
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [message, setMessage] = useState("");

//   useEffect(() => {
//     let cancelled = false;

//     async function load() {
//       try {
//         const response = await api<ResponseData>("/api/v1/admin/instagram");
//         if (cancelled) return;

//         setConfig(response.data.config);
//         setSelected(response.data.selectedProducts ?? []);
//       } catch (error) {
//         if (!cancelled) {
//           setMessage(error instanceof Error ? error.message : "Could not load Instagram settings.");
//         }
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     void load();
//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   useEffect(() => {
//     let cancelled = false;

//     const timer = setTimeout(async () => {
//       if (search.trim().length < 2) {
//         setResults([]);
//         return;
//       }

//       try {
//         const response = await api<ResponseData>(
//           `/api/v1/admin/instagram?q=${encodeURIComponent(search.trim())}`,
//         );
//         if (!cancelled) setResults(response.data.products ?? []);
//       } catch {
//         if (!cancelled) setResults([]);
//       }
//     }, 350);

//     return () => {
//       cancelled = true;
//       clearTimeout(timer);
//     };
//   }, [search]);

//   function addProduct(product: Product) {
//     setSelected((current) =>
//       current.some((item) => item.sku === product.sku)
//         ? current
//         : [...current, product],
//     );
//   }

//   function removeProduct(sku: string) {
//     setSelected((current) => current.filter((item) => item.sku !== sku));
//   }

//   function moveProduct(index: number, direction: -1 | 1) {
//     setSelected((current) => {
//       const next = [...current];
//       const target = index + direction;

//       if (target < 0 || target >= next.length) return current;

//       [next[index], next[target]] = [next[target], next[index]];
//       return next;
//     });
//   }

//   async function save() {
//     setSaving(true);
//     setMessage("");

//     try {
//       await api("/api/v1/admin/instagram", {
//         method: "PUT",
//         json: {
//           enabled: config.enabled,
//           title: config.title,
//           description: config.description,
//           skus: selected.map((product) => product.sku),
//         },
//       });

//       setConfig((current) => ({
//         ...current,
//         skus: selected.map((product) => product.sku),
//       }));
//       setMessage("Instagram Shop settings saved successfully.");
//     } catch (error) {
//       setMessage(error instanceof Error ? error.message : "Could not save settings.");
//     } finally {
//       setSaving(false);
//     }
//   }

//   if (loading) {
//     return <div className="p-8 text-sm text-muted-foreground">Loading Instagram Shop...</div>;
//   }

//   return (
//     <div className="space-y-8 p-6">
//       <div className="flex flex-wrap items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-semibold">Instagram Shop</h1>
//           <p className="mt-1 text-sm text-muted-foreground">
//             Choose and arrange the products shown on your Instagram landing page.
//           </p>
//         </div>
//         <Button onClick={save} disabled={saving}>
//           {saving ? "Saving..." : "Save Changes"}
//         </Button>
//       </div>

//       {message && (
//         <p className="rounded-lg border p-3 text-sm">{message}</p>
//       )}

//       <section className="space-y-4 rounded-xl border p-5">
//         <h2 className="font-semibold">Page Settings</h2>

//         <label className="flex items-center gap-3 text-sm">
//           <input
//             type="checkbox"
//             checked={config.enabled}
//             onChange={(event) =>
//               setConfig((current) => ({ ...current, enabled: event.target.checked }))
//             }
//           />
//           Enable public Instagram Shop page
//         </label>

//         <div className="space-y-2">
//           <label className="text-sm font-medium">Page title</label>
//           <Input
//             value={config.title}
//             onChange={(event) =>
//               setConfig((current) => ({ ...current, title: event.target.value }))
//             }
//             placeholder="Shop our Instagram edit"
//           />
//         </div>

//         <div className="space-y-2">
//           <label className="text-sm font-medium">Page description</label>
//           <textarea
//             className="min-h-24 w-full rounded-lg border bg-transparent p-3 text-sm"
//             value={config.description}
//             onChange={(event) =>
//               setConfig((current) => ({ ...current, description: event.target.value }))
//             }
//             placeholder="Discover the pieces we are sharing on Instagram."
//           />
//         </div>
//       </section>

//       <section className="space-y-4 rounded-xl border p-5">
//         <h2 className="font-semibold">Add Products</h2>
//         <Input
//           value={search}
//           onChange={(event) => setSearch(event.target.value)}
//           placeholder="Search products by name or SKU..."
//         />

//         {search.trim().length >= 2 && (
//           <div className="space-y-2">
//             {results.map((product) => {
//               const alreadyAdded = selected.some((item) => item.sku === product.sku);

//               return (
//                 <div
//                   key={product.sku}
//                   className="flex items-center gap-3 rounded-lg border p-3"
//                 >
//                   {product.images?.[0] ? (
//                     <img
//                       src={product.images[0]}
//                       alt={product.name}
//                       className="h-14 w-14 rounded-md object-cover"
//                     />
//                   ) : (
//                     <div className="h-14 w-14 rounded-md bg-muted" />
//                   )}

//                   <div className="min-w-0 flex-1">
//                     <p className="truncate text-sm font-medium">{product.name}</p>
//                     <p className="text-xs text-muted-foreground">
//                       SKU: {product.sku}
//                     </p>
//                     <p className="text-sm">{formatINR(product.pricing.sellingPrice)}</p>
//                   </div>

//                   <Button
//                     size="sm"
//                     disabled={alreadyAdded}
//                     onClick={() => addProduct(product)}
//                   >
//                     {alreadyAdded ? "Added" : "Add"}
//                   </Button>
//                 </div>
//               );
//             })}

//             {results.length === 0 && (
//               <p className="text-sm text-muted-foreground">No matching products found.</p>
//             )}
//           </div>
//         )}
//       </section>

//       <section className="space-y-4 rounded-xl border p-5">
//         <div className="flex items-center justify-between">
//           <h2 className="font-semibold">Selected Products</h2>
//           <span className="text-sm text-muted-foreground">{selected.length} products</span>
//         </div>

//         {selected.length === 0 ? (
//           <p className="text-sm text-muted-foreground">
//             No products selected yet. Search above to add products.
//           </p>
//         ) : (
//           <div className="space-y-2">
//             {selected.map((product, index) => (
//               <div
//                 key={product.sku}
//                 className="flex items-center gap-3 rounded-lg border p-3"
//               >
//                 <span className="w-6 text-sm text-muted-foreground">{index + 1}.</span>

//                 {product.images?.[0] ? (
//                   <img
//                     src={product.images[0]}
//                     alt={product.name}
//                     className="h-14 w-14 rounded-md object-cover"
//                   />
//                 ) : (
//                   <div className="h-14 w-14 rounded-md bg-muted" />
//                 )}

//                 <div className="min-w-0 flex-1">
//                   <p className="truncate text-sm font-medium">{product.name}</p>
//                   <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
//                   <p className="text-sm">{formatINR(product.pricing.sellingPrice)}</p>
//                 </div>

//                 <div className="flex items-center gap-1">
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     disabled={index === 0}
//                     onClick={() => moveProduct(index, -1)}
//                   >
//                     ↑
//                   </Button>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     disabled={index === selected.length - 1}
//                     onClick={() => moveProduct(index, 1)}
//                   >
//                     ↓
//                   </Button>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     onClick={() => removeProduct(product.sku)}
//                   >
//                     Remove
//                   </Button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </section>

//       <div className="flex justify-end">
//         <Button onClick={save} disabled={saving}>
//           {saving ? "Saving..." : "Save Changes"}
//         </Button>
//       </div>
//     </div>
//   );
// }



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

type ResponseData = {
  config: Config;
  products: Product[];
  selectedProducts: Product[];
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

export default function InstagramAdminPage() {
  const [group, setGroup] = useState("default");
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [selected, setSelected] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

        setConfig(response.data.config);
        setSelected(response.data.selectedProducts ?? []);
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
        if (!cancelled) setResults([]);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, group]);

  function addProduct(product: Product) {
    setSelected((current) =>
      current.some((item) => item.sku === product.sku)
        ? current
        : [...current, product],
    );
  }

  function removeProduct(sku: string) {
    setSelected((current) =>
      current.filter((item) => item.sku !== sku),
    );
  }

  function moveProduct(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const next = [...current];
      const target = index + direction;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const skus = selected.map((product) => product.sku);

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

      setMessage(
        `${INSTAGRAM_GROUPS.find((item) => item.value === group)?.label ?? group} Instagram settings saved successfully.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-muted">
        Loading Instagram Shop...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Instagram Shop</h1>
          <p className="mt-1 text-sm text-muted">
            Manage Instagram-curated products separately for each homepage group.
          </p>
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

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
          Each group has its own products, title, description, and enabled setting.
        </p>
      </section>

      {message && (
        <p className="rounded-lg border p-3 text-sm">
          {message}
        </p>
      )}

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
                (item) => item.sku === product.sku,
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
                    disabled={alreadyAdded}
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

      <section className="space-y-4 rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Selected Products</h2>

          <span className="text-sm text-muted">
            {selected.length} products
          </span>
        </div>

        {selected.length === 0 ? (
          <p className="text-sm text-muted">
            No products selected yet. Search above to add products.
          </p>
        ) : (
          <div className="space-y-2">
            {selected.map((product, index) => (
              <div
                key={product.sku}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span className="w-6 text-sm text-muted">
                  {index + 1}.
                </span>

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

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={index === 0}
                    onClick={() => moveProduct(index, -1)}
                  >
                    ↑
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={index === selected.length - 1}
                    onClick={() => moveProduct(index, 1)}
                  >
                    ↓
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeProduct(product.sku)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
