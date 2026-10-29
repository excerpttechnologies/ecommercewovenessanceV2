import { Types, type Connection } from "mongoose";
import { ERP_CLASSIFICATION_COLLECTIONS } from "@/lib/erp-mapping";

/**
 * ecommerceproduct stores the weave / fabric / craft / occasion / colour choices as ids
 * (byWeave, byFabric, ...). Since 29-10-2026 the RetailERP keeps those names in byweave /
 * byfabric / bycraft / byoccasion / bycolour (productclassificationoption is no longer used),
 * so the id -> name lookup reads all five. Deleted (isActive false) names are left out.
 */
export async function loadClassificationNames(connection: Connection, ids: readonly string[]): Promise<Map<string, string>> {
  const objectIds = [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  const names = new Map<string, string>();
  if (!objectIds.length) return names;
  await Promise.all(ERP_CLASSIFICATION_COLLECTIONS.map(async (collection) => {
    const options = await connection.db!.collection<{ _id: Types.ObjectId; name?: unknown }>(collection)
      .find({ _id: { $in: objectIds }, isActive: { $ne: false } }, { projection: { _id: 1, name: 1 } })
      .toArray();
    for (const option of options) {
      if (typeof option.name === "string" && option.name.trim()) names.set(String(option._id), option.name.trim());
    }
  }));
  return names;
}

/** The name to show for a stored value: its name for an id, the value itself for text, nothing for an id with no name. */
export function classificationLabel(value: string, names: ReadonlyMap<string, string>): string | undefined {
  const name = names.get(value);
  if (name) return name;
  return /^[a-f0-9]{24}$/i.test(value) ? undefined : value;
}
